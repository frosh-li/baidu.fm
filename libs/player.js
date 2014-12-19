var Speaker = require('speaker');
var lame = require("lame");
var fs = require("fs");
var async = require("async");
var request = require("request");
var keypress = require("keypress");
var colorlog = require('ninja-colorlog');
var _ = require('lodash');

var channels = [{channel:"public_tuijian_rege",content:"近期最热门的歌就在这里了!"},{channel:"public_tuijian_billboard",content:"Billboard金曲全收录 最Hot欧美大流行"},{channel:"public_tuijian_ktv",content:"网罗百听不厌的K歌金曲"},{channel:"public_tuijian_wangluo",content:"你不能错过的 最红网络流行曲!"},{channel:"public_tuijian_chengmingqu",
content:"还记得你与他们/她们相遇的第一首歌吗？"},{channel:"public_tuijian_yingshi",content:"熟悉的旋律 唤醒散落在影视剧里的回忆"},{channel:"public_tuijian_kaiche",content:"那些适合开车时听的歌 "},{channel:"public_shiguang_jingdianlaoge",content:"让我们聆听经典，回味青春。"},{channel:"public_shiguang_70hou",content:"往日的流行 今日的经典 那是属于我们的美好年代"},{channel:"public_shiguang_80hou",content:"一起听 那些陪伴80后成长的歌~"},{channel:"public_shiguang_90hou",content:"“年轻”没有定义，心与音乐共鸣!"},{channel:"public_shiguang_xinge",content:"第一时间收听潮流新曲 让耳朵新鲜每一天!"},{channel:"public_shiguang_erge",
content:"陪宝贝唱一首童真的歌"},{channel:"public_shiguang_lvxing",content:"音乐是旅途里的回忆 也是梦想中的目的地"},{channel:"public_shiguang_yedian",content:"跟着节奏一起舞动，点燃你的激情！"},{channel:"public_fengge_minyao",content:"放慢脚步 任时光流淌成一首温暖的歌"},{channel:"public_fengge_liuxing",content:"全球流行音乐全搜罗"},{channel:"public_fengge_dj",content:"国内外嗨爆DJ舞曲大集结!"},{channel:"public_fengge_qingyinyue",content:"抛开尘世的喧嚣 直抵心灵的避风港"},{channel:"public_fengge_xiaoqingxin",content:"只属于你的清新小世界"},{channel:"public_fengge_zhongguofeng",content:"在悠扬的旋律中感受流行音乐里的东方味道"},
{channel:"public_fengge_yaogun",content:"就是爱听摇滚乐!"},{channel:"public_fengge_dianyingyuansheng",content:"经典的故事 流转的旋律"},{channel:"public_xinqing_huankuai",content:"快乐的时候就要听快乐的歌"},{channel:"public_xinqing_jimo",content:"一个人的时光 我只想静静听一首歌"},{channel:"public_xinqing_shanggan",content:"心情不好的时候 情感共鸣是最好的安慰"},{channel:"public_xinqing_tianmi",content:"绽放在心里的小甜蜜 忍不住地嘴角上扬"},{channel:"public_xinqing_qingge",content:"总有一首歌 陪你走过爱情旅程"},{channel:"public_xinqing_shuhuan",content:"舒缓的节奏 安静地陪伴"},{channel:"public_xinqing_yonglanwuhou",
content:"用音乐 冲泡一杯清香惬意的下午茶"},{channel:"public_xinqing_qingsongjiari",content:"抛开烦恼，尽享假日的轻松自在!"},{channel:"public_yuzhong_huayu",content:"经典之外 让好音乐不再错过"},{channel:"public_yuzhong_oumei",content:"那些你听过的、没听过的、最动听的英文歌"},{channel:"public_yuzhong_riyu",content:"网罗最In流行曲 聆听最正日本范儿"},{channel:"public_yuzhong_hanyu",content:"K-pop正流行!"},{channel:"public_yuzhong_yueyu",content:"聆听粤语里的百转千回"},{channel:"public_tuijian_winter",content:"这个冬天，你需要一首暖心的歌"}];
var fmHost = "http://fm.baidu.com/";

var DEBUG = true;

if (process.env.DEBUG != '1') {
    DEBUG = false;
    console.error = function () {};
}

console.log('\033[?25l');

function Player(){
    this.songList = [];
    this.decoderStream = null;
    this.speaker = null;
    this.stoped = false;
    this.eventMap = {};
    this.playTime = -1;
    this.lrc = null;
    this.retryGetLrcIndex = 0;
    this.lrcInter = null;
    this.curLrcLine = 0;
    this.channel = "public_fengge_liuxing";
    this.attackEvent();
    this.channelChange();
    this.menuStatus = 0;
    this.listOpen = 0;
}

Player.prototype.play = function(){
    var self = this;
    if(this.songList.length < 1){
        this.getSongs(function(){
            self._play();
        });
    }else{
        self._play();
    }
};

Player.prototype.playNext = function(){
    this.stop();
};

Player.prototype.attackEvent = function(){
    var self = this;
    keypress(process.stdin);
    process.stdin.on("keypress", function(ch,key){
        if(key && key.name == "n"){
            self.playNext();
        }
        if(key && (key.name == "q" || key.name == "x")){
            process.stdout.clearScreenDown();
            process.exit(0);
        }
        if(key && key.name == "s"){
            self.stoped = true;
            self.stop();
        }
        if(key && key.name == "w"){
            self.print_channel();
        }
        if(key && key.name == "l"){
            self.printList();
        }
        if(key && key.name == "p" && self.stoped == true){
            self.stoped = false;
            self.doPlay();
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
    print_Common();
};

Player.prototype.print_channel = function(){
    var self = this;
    if(self.menuStatus == 1){
        process.stdout.cursorTo(0, 0);
        process.stdout.clearScreenDown();
        self.menuStatus = 0;
        print_Common();
    }else{
        process.stdout.cursorTo(0, 15);
        process.stdout.clearScreenDown();
        for(var i = 0 ; i < channels.length ; i++){
            colorlog.log.yellow('    '+(i+1)+': '+channels[i]['content']);
        }
        self.menuStatus = 1;
    }

};

Player.prototype.channelChange = function(){
    var self = this;
    var timeout = null;
    for(var i = 0 ; i < channels.length ; i++){
        self.eventMap[(i+1)] = channels[i]['channel'];
    }
    var input = "";
    process.stdin.on("keypress", function(ch,key){
        if(ch >= 0 && ch <= 37){
            if(timeout){
                clearTimeout(timeout);
            }
            input += "" + ch;
            timeout = setTimeout(function(){
                self.playChannel(input);
                input = "";
                self.menuStatus = 0;
            },1000);
        }
    });
};

Player.prototype.playChannel = function(key){
    // console.log('channel index', key);
    var self = this;
    if(!self.eventMap[key]){
        return;
    }
    self.channel = self.eventMap[key];
    self.stop();
    self.songList = [];
};

Player.prototype.stop = function(){
    this.decoderStream && this.decoderStream.unpipe();
    this.decoderStream = null;
    this.lrc = null;
    this.retryGetLrcIndex += 1;
    this.speaker && this.speaker.end();
    print_Common();
};

Player.prototype.getSongs = function(cb){
    var self = this;
    var url = "http://fm.baidu.com/dev/api/?tn=playlist&id="+self.channel+"&special=flash&prepend=&format=json&_="+Date.now();
    request(url,function(err,response,body){
        if(err){
            //console.log(err);
            return;
        }
        //console.log(JSON.parse(body).list);
        var list = JSON.parse(body).list;
        getMp3Lists(getIds(list),function(lists){
            self.songList = self.songList.concat(lists);
            cb();
        });
    });
};

Player.prototype.printList = function(){
    var list = this.songList;
    if(this.listOpen){
        process.stdout.cursorTo(0,15);
        process.stdout.clearScreenDown();
        this.listOpen = 0;
    }else{
        process.stdout.cursorTo(0,15);
        process.stdout.clearScreenDown();
        colorlog.log.yellow('再次按下l键关闭歌单');
        list.forEach(function(song){
            console.log(song.artistName,song.songName);
        });
        this.listOpen = 1;
    }

};

Player.prototype.getLrc = function(url) {
    var self = this;
    var retry = this.retryGetLrcIndex;
    request.get(url, function (err, res, body){
        if (err || res.statusCode != 200) {
            console.error('get lrc error', res.statusCode, err);
            setTimeout(function () {
                console.error('retry get lrc from', url);
                if (retry === self.retryGetLrcIndex) {
                    self.getLrc(url);
                }
            }, 2000);
        } else {
            self.lrc = body.toString('utf-8');
            console.error('get new lrc ', self.lrc);
        }
    });
};

Player.prototype._play = function(){
    var self = this;
    var song = self.songList[0];
    print_Common();
    colorlog.log.green('  开始缓冲',song.artistName,"的",song.songName);
    var req = request.get(song.songLink);
    var decoder = new lame.Decoder();
    self.speaker = new Speaker();
    var downloaded = 0;
    var totalSize = 0;
    var lrcUrl = fmHost + song.lrcLink;
    console.error('get lrc url: ', lrcUrl);
    self.lrc = null;
    self.getLrc(lrcUrl);
    req.on('response', function(res){
        //console.log(res.headers);
        process.stdout.moveCursor(0,-1);
        process.stdout.clearLine();
        totalSize = res.headers['content-length'];
        print_Common();
        self.startLrcShow(song);
        //colorlog.log.blue('下载进度监控', "0%");
    }).on('error',function(err){
        console.log('缓冲音乐失败，请检查网络后重试');
    }).on('data', function(chunk){
        if(typeof chunk != "string"){
            downloaded += chunk.length;
        }
        //process.stdout.moveCursor(0,-1);
        //process.stdout.clearLine();
        //colorlog.log.blue('下载进度监控', parseInt((downloaded / totalSize) * 100) +"%");
    }).on('close', function(res){
        //process.stdout.moveCursor(0,-2);
        //process.stdout.clearScreenDown();
        //console.log('当前音乐下载完成');
    });
    buffer = req.pipe(decoder);
    buffer.pipe(self.speaker).on('close', function(){
        if(!self.stoped){
            self.songList.shift();
            self.play();
        }
    });
    self.decoderStream = decoder;
};

Player.prototype.doPlay = function(){
    this._play();
};

Player.prototype.startLrcShow = function(song){
    var self = this;
    this.playTime = Date.now();
    var lrcObj = null;

    if (self.lrcInter) {
        clearInterval(self.lrcInter);
    }

    self.lrcInter = setInterval(function () {
        if (!lrcObj) {
            lrcObj = getLrcObj(self.lrc);
            console.error('get lrcObj: ', lrcObj);
        }
        var pastTime = Date.now() - self.playTime;
        self.showLines(lrcObj, 7, pastTime, song);
    }, 100);
};

Player.prototype.getTimeStr = function (seconds) {
    var min = Math.floor(seconds / 60);
    var sec = Math.floor(seconds % 60);

    return [addzero(min, 2), addzero(sec, 2)].join(':');

    function addzero(val, num) {
        var zs = '';
        val = val.toString();
        if (val.length < num) {
            zs = _.times(num - val.length, function () {return '0';});
        }
        return zs + val;
    }

};

function getLrcObj(content) {
    // console.error('content', content);
    if (!content) {
        return null;
    }
    var obj = [];
    var lines = content.split('\n');
    _.forEach(lines, function (line) {
        parseLine(line);
    });

    return obj;

    function parseLine(line) {
        line = line.trim();
        if (line.indexOf('[') !== 0) {
            return;
        }
        /*
            [
              '[00:02.52]作曲：许嵩 作词：许嵩',
              '00',
              '02',
              '52',
              '作曲：许嵩 作词：许嵩',
              index: 0,
              input: '[00:02.52]作曲：许嵩 作词：许嵩'
            ]
        */
        var re = new RegExp(/\[([0-9]{2}):([0-9]{2})\.([0-9]{2})\](.*)/);
        var matches = line.match(re);
        if (matches === null) {
            return;
        }
        timetag = getTimeTag(matches[1], matches[2], matches[3]);
        if (!matches[4].match(re)) {
            obj.push({
                timetag: timetag,
                msg: matches[4]
            });
        } else {
            obj.push({timetag: timetag, msg: ''});
            parseLine(matches[4]);
        }
    }
}

function getTimeTag(min, sec, ms) {
    return min * 60 * 1000 + sec * 1000 + ms * 10;
}

Player.prototype.showLines = function (lrcObj, totalShowLine, timetag, song) {
    if (this.listOpen || this.menuStatus) {
        return;
    }


    process.stdout.cursorTo(0, 9);
    process.stdout.clearLine();
    var timestr = this.getTimeStr((Date.now() - this.playTime) / 1000) + '/' + this.getTimeStr(song.time);
    //"size",(song.size/1024/1024).toFixed(2)+"M"
    colorlog.log.green('  开始播放',song.artistName,"的",song.songName,"\033[20;33m["+timestr+"]\033[0m");

    process.stdout.cursorTo(0, 22);
    process.stdout.clearLine();
    //colorlog.log.yellow('  ' + timestr);

    if (!lrcObj) {
        return;
    }
    curline = _.sortedIndex(lrcObj, {timetag: timetag}, 'timetag') - 1;
    if (this.curLrcLine == curline) {
        return;
    }
    this.curLrcLine = curline;
    //console.log('curline: ', curline, ' timetag: ', timetag);

    endIndex = curline + Math.floor(totalShowLine / 2);
    startIndex = endIndex - totalShowLine + 1;
    printLine = 12;
    while(startIndex <= endIndex) {
        process.stdout.cursorTo(0, printLine);
        process.stdout.clearLine();
        var msg = '      ';
        if (lrcObj[startIndex] && lrcObj[startIndex].msg) {
            msg += lrcObj[startIndex].msg;
        }
        if (startIndex == curline) {
            colorlog.log.yellow(msg);
        } else {
            colorlog.log.white(msg);
        }

        printLine += 1;
        startIndex += 1;
    }
};

function getIds(list,cb){
    var ret = [];
    list.forEach(function(item){
        ret.push(item.id);
    });
    return ret;
}

function listParse(songlists){
    var ret = [];
    songlists.forEach(function(song){
        if(song.songLink){
            ret.push(song);
        }
    });
    return ret;
}


function getMp3Lists(ids, cb){
    var now = Date.now();
    var url = "http://music.baidu.com/data/music/fmlink?songIds="+ids.join(",")+"&type=mp3&rate=128&callback=jsonlink"+now+"&_="+now;
    console.error(url);
    request(url, function(err, response, body){
        if(err){
            //console.log(err);
            return;
        }

        var datas = JSON.parse(body.replace("jsonlink"+now+"(","").replace(/\)$/,""));
        var songlists = datas.data.songList;
        var list = listParse(songlists);
        cb(list);
    });
}
function print_Common(){
    process.stdout.cursorTo(0,0);
    process.stdout.clearScreenDown();
    colorlog.log.green('  ----------------------');
    colorlog.log.red('      百度音乐随心听');
    colorlog.log.green('      n: 下一首');
    colorlog.log.green('      p: 继续');
    colorlog.log.green('      s: 暂停');
    colorlog.log.green('      w: 选择音乐频道');
    colorlog.log.green('      l: 打印剩余歌单');
    colorlog.log.green('      q: 退出播放器');
    colorlog.log.green('  ----------------------');
}
module.exports = Player;

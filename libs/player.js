var Speaker = require('speaker');
var lame = require("lame");
var fs = require("fs");
var async = require("async");
var request = require("request");
var keypress = require("keypress");
var colorlog = require('ninja-colorlog');

function Player(){
    this.songList = [];
    this.decoderStream = null;
    this.speaker = null;
    this.stoped = false;
    this.attackEvent();
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
}

Player.prototype.playNext = function(){
    this.songList.shift();
    this.decoderStream.unpipe();
    this.decoderStream = null;
    this.speaker.end();
    this._play();
}

Player.prototype.attackEvent = function(){
    var self = this;
    keypress(process.stdin);
    process.stdin.on("keypress", function(ch,key){
        if(key && key.name == "n"){
            
            self.playNext();
        }
        if(key && key.name == "x"){
            process.exit(0);
        }
        if(key && key.name == "s"){
            self.stoped = true;
            self.stop();
        }
        if(key && key.name == "p" && self.stoped == true){
            self.stoped = false;
            self.doPlay();   
        }
    });
    process.stdin.setRawMode(true);
    process.stdin.resume();
    colorlog.log.green('----------------------');
    colorlog.log.red('    百度音乐随心听');
    colorlog.log.green('    n: 下一首');
    colorlog.log.green('    p: 继续');
    colorlog.log.green('    s: 暂停');
    colorlog.log.green('    x: 退出播放器');
    colorlog.log.green('----------------------');
}

Player.prototype.stop = function(){
    this.decoderStream.unpipe();
    this.decoderStream = null;
    this.speaker.end();
}

Player.prototype.getSongs = function(cb){
    var self = this;
    var url = "http://fm.baidu.com/dev/api/?tn=playlist&id=public_fengge_liuxing&special=flash&prepend=&format=json&_="+Date.now();
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
}


Player.prototype._play = function(){
    var self = this;
    var song = self.songList[0];
    colorlog.log.green('正在播放',song.artistName,"的",song.songName);
    var req = request(song.songLink);
    var decoder = new lame.Decoder();
    self.speaker = new Speaker();
    buffer = req.pipe(decoder);
    buffer.pipe(self.speaker).on('end', function(){
        self.songList.shift();
        self.play();
    });
    self.decoderStream = decoder;
}

Player.prototype.doPlay = function(){
    this.speaker._play();
}

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
    console.log(url);
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

module.exports = Player;
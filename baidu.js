var Speaker = require('speaker');
var lame = require("lame");
var fs = require("fs");
var async = require("async");
var request = require("request");
var keypress = require("keypress");
var PoolStream = require('pool_stream');
var colorlog = require('ninja-colorlog');
// Create the Speaker instance


// PCM data from stdin gets piped into the speaker
//process.stdin.pipe(speaker);
//fs.createReadStream("./aaa.mp3").pipe(new lame.Decoder()).pipe(new Speaker());
var globalSongList = [];
var speaker,
    readableStream,
    gdecoder,
    buffer;
function play(){
    if(globalSongList.length < 1){
        getPlayerList(function(){
            _play();
        });
    }else{
        _play();
    }
    
}
function _blank(){

}

function _play(){
    var song = globalSongList.shift();
    colorlog.log.green('正在播放',song.artistName,"的",song.songName);
    var req = request(song.songLink);
    var decoder = new lame.Decoder();
    speaker = new Speaker();
    buffer = req.pipe(decoder);
    buffer.pipe(speaker).on('close', play);
    readableStream = req;
    gdecoder = decoder;
}

function getPlayerList(cb){
    var url = "http://fm.baidu.com/dev/api/?tn=playlist&id=public_fengge_liuxing&special=flash&prepend=&format=json&_="+Date.now();
    request(url,function(err,response,body){
        if(err){
            console.log(err);
            return;
        }
        //console.log(JSON.parse(body).list);
        var list = JSON.parse(body).list;
        getMp3Lists(getIds(list),cb);
    });
}

function getIds(list,cb){
    var ret = [];
    list.forEach(function(item){
        ret.push(item.id);
    });
    return ret;
}

function getMp3Lists(ids, cb){
    var now = Date.now();
    var url = "http://music.baidu.com/data/music/fmlink?songIds="+ids.join(",")+"&type=mp3&rate=128&callback=jsonlink"+now+"&_="+now;
    request(url, function(err, response, body){
        if(err){
            console.log(err);
            return;
        }

        var datas = JSON.parse(body.replace("jsonlink"+now+"(","").replace(/\)$/,""));
        var songlists = datas.data.songList;
        var list = listParse(songlists);
        globalSongList = globalSongList.concat(list);
        cb();
    });

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


keypress(process.stdin);
process.stdin.on("keypress", function(ch,key){
    if(key && key.name == "n"){
        gdecoder.unpipe();
        gdecoder = null;
        speaker.end();
        //process.stdin.pause();
    }
    if(key && key.name == "x"){
        process.exit(0);
    }
});
process.stdin.setRawMode(true);
process.stdin.resume();
colorlog.log.green('----------------------');
colorlog.log.red('    百度音乐随心听');
colorlog.log.green('    n: 下一首');
colorlog.log.green('    x: 退出播放器');
colorlog.log.green('----------------------');
exports.play = play;
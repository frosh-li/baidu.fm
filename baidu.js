var Speaker = require('speaker');
var lame = require("lame");
var fs = require("fs");
var async = require("async");
var request = require("request");
var keypress = require("keypress");
var PoolStream = require('pool_stream');
// Create the Speaker instance


// PCM data from stdin gets piped into the speaker
//process.stdin.pipe(speaker);
//fs.createReadStream("./aaa.mp3").pipe(new lame.Decoder()).pipe(new Speaker());
var globalSongList = [];
var speaker = new Speaker();
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
    console.log('正在播放',song.artistName,"的",song.songName,song.songLink);
    request.get(song.songLink,function(err,res){
        var pool = new PoolStream();
        res.pipe(pool);        
        pool.pipe(new lame.Decoder()).pipe(speaker).on('close',play);
        speaker.readableStream = pool;
    });
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
        try{
            speaker.readableStream.unpipe();
            speaker.end();
        }catch(e){
            _blank();
        }
        play();
    }
});
exports.play = play;
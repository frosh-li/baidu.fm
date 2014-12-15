var Speaker = require('speaker');
var lame = require("lame");
var fs = require("fs");
var async = require("async");
var request = require("request");
// Create the Speaker instance


// PCM data from stdin gets piped into the speaker
//process.stdin.pipe(speaker);
//fs.createReadStream("./aaa.mp3").pipe(new lame.Decoder()).pipe(new Speaker());

function play(list){
    var song = list.shift();
    console.log('正在播放',song.artistName,"的",song.songName);
    request(song.songLink).pipe(new lame.Decoder()).pipe(new Speaker()).on('close', function(){
        play(list);
    });    
}
function getPlayerList(){
    var url = "http://fm.baidu.com/dev/api/?tn=playlist&id=public_fengge_liuxing&special=flash&prepend=&format=json&_="+Date.now();
    request(url,function(err,response,body){
        if(err){
            console.log(err);
            return;
        }
        console.log(JSON.parse(body).list);
        var list = JSON.parse(body).list;
        getMp3Lists(getIds(list));
    });
}

function getIds(list){
    var ret = [];
    list.forEach(function(item){
        ret.push(item.id);
    });
    return ret;
}

function getMp3Lists(ids){
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
        play(list);
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
exports.play = getPlayerList;
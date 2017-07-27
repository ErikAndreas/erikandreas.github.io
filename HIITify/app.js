"use strict"
var elPlaylists = document.getElementById("playlistsHigh");
var elPlaylistsLow = document.getElementById("playlistsLow");
var elDevices = document.getElementById("devices");
var elIsRand = document.getElementById("isRand");
var App = {
	client_id: '9d4ecfc733cf415887763c509a274bc5',
	init: function() {
		console.log('app');
		if (!Spotify.token &&!location.hash) {
			Spotify.client_id = App.client_id;
			Spotify.login();
		} else {
			var o = new URLSearchParams(location.hash.substring(1));
			//TODO: check state matches
			Spotify.token = o.get('access_token');
			console.log(Spotify.token);
			Spotify.devices().then((data) => {
				console.log(data);
				data.devices.forEach((dev) => {
					var opt = document.createElement('option');
		    		opt.value = dev.id;
		    		opt.innerHTML = dev.type + ' - ' + dev.name;
		   			elDevices.appendChild(opt);
				});

			});
			Spotify.me().then((data) => {				
				console.log(data);
			});		
			rmOptions(elPlaylists);
			rmOptions(elPlaylistsLow);
			getPlayLists(0, 50);
		}
	}
};

/* UI
/
about + connect
/home
select device + rescan
hiitfy ui
	
*/
var elTot = document.getElementById("tot");
var elCurr = document.getElementById("curr");
var elArtist = document.getElementById("artist");
var elTitle = document.getElementById("title");	
var elArtwork = document.getElementById("artwork");
var elBtnStart = document.getElementById("btnStart");

var totTime = 5*60;
var loTime = 15;
var hiTime = 10;
var isHigh = false;
var songRemaining = -1;
var totTimer = new Timer({
	tick: 250,
	onend: function() {
		loTimer.stop();
		hiTimer.stop();
		Spotify.pauseSong(elDevices.options[elDevices.selectedIndex].value);
		console.log('tot end');
	},
	ontick: function() {
		//console.log('ontick');
		elTot.innerHTML=Math.floor(totTimer.getDuration()/1000).toMMSS();
		elCurr.innerHTML=Math.floor(isHigh?hiTimer.getDuration()/1000:loTimer.getDuration()/1000).toSS();
		// TODO: check curr interval if interval < track.duration_ms - startAt -> restart track
	    //60-45 - left > 0
	    //songRemaining = (isHigh?hiTime:loTime)-(playlistTracks[currSong].duration_ms/1000)+parseFloat(analysis[playlistTracks[currSong].id])-(isHigh?hiTimer.getDuration()/1000:loTimer.getDuration()/1000);
		if (isHigh) {
			songRemaining = (hiTime)-(playlistTracks[currSong].duration_ms/1000)+parseFloat(analysis[playlistTracks[currSong].id])-(hiTimer.getDuration()/1000);
		} else {
			songRemaining = (loTime)-(playlistTracksLow[currSongLow].duration_ms/1000)+parseFloat(analysis[playlistTracksLow[currSongLow].id])-(loTimer.getDuration()/1000);
		}
		//console.log((isHigh?hiTime:loTime),(playlistTracks[currSong].duration_ms/1000),parseFloat(analysis[playlistTracks[currSong].id]),(isHigh?hiTimer.getDuration()/1000:loTimer.getDuration()/1000));
		//console.log((isHigh?hiTime:loTime)-(playlistTracks[currSong].duration_ms/1000)+parseFloat(analysis[playlistTracks[currSong].id])-(isHigh?hiTimer.getDuration()/1000:loTimer.getDuration()/1000));
		
		if (songRemaining > 0 && (Math.ceil(songRemaining + 0.750)==1)) {
			console.log("RESTART");
			if (Spotify.isPlaying)
				handlePlay();
		} 		
	}
});
var loTimer = new Timer({
	onstart: function() {
		console.log('lo start');
		handlePlay();
	},
	onend: function() {
		isHigh=true;
		++currSongLow;
		hiTimer.start(hiTime);
		console.log('lo end');
	}
});
var hiTimer = new Timer({
	onstart: function() {
		console.log('hi start');
		handlePlay();
	},
	onend: function() {
		isHigh=false;
		++currSong;
		loTimer.start(loTime);
		console.log('hi end');
	}
});

elPlaylists.onchange = playlistSelChanged;
elPlaylistsLow.onchange = playlistSelChanged;

var outgoing = 0;
var playlistTracks = [];
var playlistTracksLow = [];
var orgPlayListTracks = [];
var orgPlayListTracksLow = [];
var analysis = [];
var currSong = 0;
var currSongLow = 0;

function fixTotTime() {
	var cycle = loTime + hiTime;
	return Math.ceil(totTime / cycle)*cycle; 
}

function start() {
	currSong = 0;
	currSongLow = 0;
	if (elIsRand.checked) {
		playlistTracks.shuffle();
		playlistTracksLow.shuffle();
	} else { // might need a 'reset'
		playlistTracks = orgPlayListTracks;
		playlistTracksLow = orgPlayListTracksLow;
	}
	totTimer.start(fixTotTime(totTime));
	loTimer.start(loTime);
}

function handlePlay() {
	Spotify.isPlaying = false;
	if (isHigh) {
		console.log(currSong, playlistTracks[currSong], analysis[playlistTracks[currSong].id]);
		if (currSong < playlistTracks.length) {
			Spotify.startSong(playlistTracks[currSong].id, analysis[playlistTracks[currSong].id], elDevices.options[elDevices.selectedIndex].value);
			elArtist.innerHTML=playlistTracks[currSong].artists[0].name;
			elTitle.innerHTML=playlistTracks[currSong].name;
			elArtwork.src = playlistTracks[currSong].album.images[0].url;
		}
	} else {
		console.log(currSongLow, playlistTracksLow[currSongLow], analysis[playlistTracksLow[currSongLow].id]);
		if (currSongLow < playlistTracksLow.length) {
			Spotify.startSong(playlistTracksLow[currSongLow].id, analysis[playlistTracksLow[currSongLow].id], elDevices.options[elDevices.selectedIndex].value);
			elArtist.innerHTML=playlistTracksLow[currSongLow].artists[0].name;
			elTitle.innerHTML=playlistTracksLow[currSongLow].name;
			elArtwork.src = playlistTracksLow[currSongLow].album.images[0].url;
		}
	}
}

function getPlayLists(offset, limit) {	
	Spotify.getPlayLists(offset, limit).then((data) => {
		console.log(data);
		data.items.forEach((pl) => {
			var opt = document.createElement('option');
    		opt.value = pl.href;
    		opt.innerHTML = pl.name;
   			elPlaylistsLow.appendChild(opt);
   			elPlaylists.appendChild(opt.cloneNode(true));   			
		});
		if (data.next) {
			getPlayLists(data.offset + data.limit, data.limit);
		}
	});
}

function analyze() {
	// reset any previous analysis (and current playlist tracks)
	playlistTracks = [];
	playlistTracksLow = [];
	analysis = [];
	outgoing = 0;
	getPlaylistTracks(0,100,elPlaylists.options[elPlaylists.selectedIndex].value,null, function(data, next) {
		var ids = "";
		outgoing += data.items.length;
		for (var i = 0; i < data.items.length; i++) {
			if (data.items[i].track.is_playable) {
				if (i > 0) ids += ",";
				ids += data.items[i].track.id;
				//console.log(data.items[i]);
				playlistTracks.push(data.items[i].track);
			} else {
				console.log('track not available', data.items[i].track);
				--outgoing;
			}
		}
		getAudioFeatures(ids);
		if (!next) {
			console.log('playlist high tracks done ' + outgoing);
			orgPlayListTracks = JSON.parse(JSON.stringify(playlistTracks));
		}
	});
	getPlaylistTracks(0,100,elPlaylistsLow.options[elPlaylistsLow.selectedIndex].value,null, function(data, next) {
		var ids = "";
		outgoing += data.items.length;
		for (var i = 0; i < data.items.length; i++) {
			if (data.items[i].track.is_playable) {
				if (i > 0) ids += ",";
				ids += data.items[i].track.id;
				//console.log(data.items[i]);
				playlistTracksLow.push(data.items[i].track);
			} else {
				console.log('track not available', data.items[i].track);
				--outgoing;
			}
		}
		getAudioFeatures(ids);
		if (!next) {
			console.log('playlist low tracks done ' + outgoing);
			orgPlayListTracksLow = JSON.parse(JSON.stringify(playlistTracksLow));
		}
	});	
}

function getPlaylistTracks(offset,limit,playlist,href, cb) {
	Spotify.getPlaylistTracks(offset,limit,playlist,href).then((data) => {
		if (data && data.next) {
			getPlaylistTracks(data.offset + data.limit, data.limit, null, data.next,cb);
		} 
		cb(data, data.next);
	});
}

function getAudioFeatures(ids) {
	Spotify.getAudioFeatures(ids).then((data) => {
		//console.log(data);
		for (var i = 0; i < data.audio_features.length; i++) {
			var lsid = localStorage.getItem(data.audio_features[i].id);
			if (!lsid) {
				Spotify.getAudioAnalysis(data.audio_features[i].analysis_url).then(function(response) {
					Promise.all([Promise.resolve(response.url), response.json()]).then(function(o){
						var url = o[0];
						var data = o[1];
						var loudness = data.track.loudness;
						var eofi = data.track.end_of_fade_in;
						var startAt = 0;
						for (var i = 0; i < data.sections.length;i++) {
							if (data.sections[i].duration >= 20 && data.sections[i].loudness > loudness) {
								startAt = data.sections[i].start;
								break;
							}
						}
						startAt = Math.max(startAt, eofi);
						var str = "/audio-analysis/"
						var id = url.substring(url.lastIndexOf(str)+ str.length);
						console.log(url, id, startAt);
						localStorage.setItem(id, startAt);
						analysis[id] = startAt;
						--outgoing;
						if (0 === outgoing) analysisDone();
					});
				}).catch(function(error) {
					console.log(error);
				});
			} else {
				analysis[data.audio_features[i].id] = lsid;
				--outgoing;				
				console.log("already got " + data.audio_features[i].id + " in cache", outgoing);
				if (0 === outgoing) analysisDone();
			}
		}	
	});
}

function analysisDone() {
	console.log('analysis done');
	elBtnStart.disabled = false;
}

function playlistSelChanged() {
	elBtnStart.disabled = true;
}

function rmOptions(el) {
	let i;
	if (el.options) {
    	for(i = el.options.length - 1 ;i >= 0 ; i--) {
        	el.remove(i);
    	}	
	}
}

Number.prototype.toMMSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var minutes = Math.floor(sec_num / 60);
    var seconds = sec_num - (minutes * 60);

    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

Number.prototype.toSS = function () {
    var sec_num = parseInt(this, 10); // don't forget the second param
    var seconds = sec_num;
    if (seconds < 10) {seconds = "0"+seconds;}
    return seconds;
}

// Array shuffling prototype
Array.prototype.shuffle = function(){
    var counter = this.length, temp, index;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        index = (Math.random() * counter--) | 0;

        // And swap the last element with it
        temp = this[counter];
        this[counter] = this[index];
        this[index] = temp;
    }
};



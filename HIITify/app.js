"use strict"
const elPlaylists = document.getElementById("playlistsHigh");
const elPlaylistsLow = document.getElementById("playlistsLow");
const elDevices = document.getElementById("devices");
const elIsRand = document.getElementById("isRand");
const App = {
	client_id: '9d4ecfc733cf415887763c509a274bc5',
	init: async function() {
		console.log('app');
		if (!Spotify.token &&!location.hash) {
			Spotify.client_id = App.client_id;
			Spotify.login();
		} else {
			const o = new URLSearchParams(location.hash.substring(1));
			//TODO: check state matches
			Spotify.token = o.get('access_token');
			console.log(Spotify.token);
			const deviceData = await Spotify.devices();
			deviceData.devices.forEach((dev) => {
				const opt = document.createElement('option');
		    	opt.value = dev.id;
		    	opt.innerHTML = dev.type + ' - ' + dev.name;
		   		elDevices.appendChild(opt);
			});		
			const me = await Spotify.me();				
			console.log(me);
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
const elTot = document.getElementById("tot");
const elCurr = document.getElementById("curr");
const elArtist = document.getElementById("artist");
const elTitle = document.getElementById("title");	
const elArtwork = document.getElementById("artwork");
const elBtnStart = document.getElementById("btnStart");

const totTime = 5*60;
const loTime = 15;
const hiTime = 10;
let isHigh = false;
let songRemaining = -1;
const totTimer = new Timer({
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
const loTimer = new Timer({
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
const hiTimer = new Timer({
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

let outgoing = 0;
let playlistTracks = [];
let playlistTracksLow = [];
let orgPlayListTracks = [];
let orgPlayListTracksLow = [];
let analysis = [];
let currSong = 0;
let currSongLow = 0;

function fixTotTime() {
	const cycle = loTime + hiTime;
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

async function getPlayLists(offset, limit) {	
	const plData = await Spotify.getPlayLists(offset, limit);
	//console.log(plData);
	plData.items.forEach((pl) => {
		const opt = document.createElement('option');
		opt.value = pl.href;
		opt.innerHTML = pl.name;
		elPlaylistsLow.appendChild(opt);
		elPlaylists.appendChild(opt.cloneNode(true));   			
	});
	if (plData.next) {
		getPlayLists(plData.offset + plData.limit, plData.limit);
	}
}

async function analyze() {
	// reset any previous analysis (and current playlist tracks)
	playlistTracks = [];
	playlistTracksLow = [];
	analysis = [];
	outgoing = 0;
	getPlaylistTracks(0,100,elPlaylists.options[elPlaylists.selectedIndex].value,null);
	getPlaylistTracksLow(0,100,elPlaylistsLow.options[elPlaylistsLow.selectedIndex].value,null);	
}

async function getPlaylistTracks(offset,limit,playlist,href) {
	const data = await Spotify.getPlaylistTracks(offset,limit,playlist,href);
	let ids = "";
	outgoing += data.items.length;
	for (let i = 0; i < data.items.length; i++) {
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
	if (data && data.next) {
		getPlaylistTracks(data.offset + data.limit, data.limit, null, data.next);
	} else {
		console.log('playlist high tracks done ' + outgoing);
		orgPlayListTracks = JSON.parse(JSON.stringify(playlistTracks));
	}	
	/* return
	 playlistTracks
	 orgPlayListTracks
	 outgoing
	*/
}

async function getPlaylistTracksLow(offset,limit,playlist,href) {
	const data = await Spotify.getPlaylistTracks(offset,limit,playlist,href);
	let ids = "";
	outgoing += data.items.length;
	for (let i = 0; i < data.items.length; i++) {
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
	if (data && data.next) {
		getPlaylistTracksLow(data.offset + data.limit, data.limit, null, data.next);
	} else {
		console.log('playlist low tracks done ' + outgoing);
		orgPlayListTracksLow = JSON.parse(JSON.stringify(playlistTracksLow));
	}
}

async function getAudioFeatures(ids) {
	const data = await Spotify.getAudioFeatures(ids);
	console.log(data);
	data.audio_features.forEach(async af => {
		var lsid = localStorage.getItem(af.id);
		if (!lsid) {
			try {
				const response = await Spotify.getAudioAnalysis(af.analysis_url);					
				const url = response.url;
				const analysisData = await response.json();
				const loudness = analysisData.track.loudness;
				const eofi = analysisData.track.end_of_fade_in;
				let startAt = 0;
				for (let i = 0; i < analysisData.sections.length;i++) {
					if (analysisData.sections[i].duration >= 20 && analysisData.sections[i].loudness > loudness) {
						startAt = analysisData.sections[i].start;
						break;
					}
				}
				startAt = Math.max(startAt, eofi);
				// assumption: audio features analysis url has format /audio-analysis/spotifysongid
				const str = "/audio-analysis/"
				const id = url.substring(url.lastIndexOf(str)+ str.length);
				console.log(url, id, startAt);
				localStorage.setItem(id, startAt);
				analysis[id] = startAt;
				--outgoing;
				if (0 === outgoing) analysisDone();					
			} catch(error) {
				console.log(error);
			}
		} else {
			analysis[af.id] = lsid;
			--outgoing;				
			console.log("already got " + af.id + " in cache", outgoing);
			if (0 === outgoing) analysisDone();
		}
	});
	/* return
	analysis
	*/
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
    const sec_num = parseInt(this, 10); // don't forget the second param
    let minutes = Math.floor(sec_num / 60);
    let seconds = sec_num - (minutes * 60);

    if (minutes < 10) {minutes = "0"+minutes;}
    if (seconds < 10) {seconds = "0"+seconds;}
    return minutes+':'+seconds;
}

Number.prototype.toSS = function () {
    const sec_num = parseInt(this, 10); // don't forget the second param
    let seconds = sec_num;
    if (seconds < 10) {seconds = "0"+seconds;}
    return seconds;
}

// Array shuffling prototype
Array.prototype.shuffle = function(){
    let counter = this.length, temp, index;

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



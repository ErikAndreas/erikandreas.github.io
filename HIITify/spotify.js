"use strict"
var Spotify = {
	client_id: '',
	token: '',
	userCountry: '',
	userId: '',
	isPlaying: false,
	login: function() {
		window.location.replace('https://accounts.spotify.com/authorize?client_id='+Spotify.client_id+'&redirect_uri=http%3A%2F%2Flocalhost%3A8080&scope=user-read-private%20user-read-playback-state%20playlist-read-private%20playlist-read-collaborative%20user-modify-playback-state&response_type=token&state=123');
	},
	req: function(url) {
		return new Request(url,{
			headers: new Headers({
				"Authorization": "Bearer "+Spotify.token
			})
		});
	},
	put: function(url) {
		return new Request(url,{
			method: 'PUT',
			headers: new Headers({
				"Authorization": "Bearer "+Spotify.token,
				"Content-Type": "application/json"
			})
		});
	},
	putBody: function(url, body) {
		return new Request(url,{
			method: 'PUT',
			headers: new Headers({
				"Authorization": "Bearer "+Spotify.token,
			}),
			body: body
		});
	},
	devices: function() {
		return fetch(Spotify.req("https://api.spotify.com/v1/me/player/devices"))
			.then(Spotify.handleErrors)
			.then((response) => {return response.json();});
	},
	me: function () {
		return fetch(Spotify.req("https://api.spotify.com/v1/me"))
			.then(Spotify.handleErrors)
			.then((response) => {return response.json();})
			.then((data) => {
				Spotify.userId = data.id;
				Spotify.userCountry = data.country;
				return data;
			});			
	},
	getPlayLists: function(offset, limit) {
		return fetch(Spotify.req("https://api.spotify.com/v1/users/spoteafy/playlists?limit="+limit+"&offset="+offset))
			.then(Spotify.handleErrors)
			.then((response) => {return response.json();});
	},
	getPlaylistTracks: function(offset,limit,playlist,href) {
		let url = href!=null?href:playlist+"/tracks?fields=items(track(name,id,is_local,is_playable,duration_ms,album(images),artists(name))),next,offset,limit&limit="+limit+"&offset="+offset+"&market="+Spotify.userCountry;
		return fetch(Spotify.req(url))
			.then(Spotify.handleErrors)
			.then((response) => {return response.json();});
	},
	getAudioFeatures: function(ids) {
		// max 100 ids
		return fetch(Spotify.req("https://api.spotify.com/v1/audio-features/?ids="+ids))
			.then(Spotify.handleErrors)
			.then((response) => {return response.json();});
	},
	getAudioAnalysis: function(url) {
		return fetch(Spotify.req(url))
			.then(Spotify.handleErrors);
	},
	pauseSong: function(deviceId) {
		return fetch(Spotify.put("https://api.spotify.com/v1/me/player/pause?device_id="+deviceId))
		.then(Spotify.handleErrors)
		.then((data) => {
			Spotify.isPlaying = false;
	  		console.log("paused"); 			
		});
	},
	startSong: function(id, startPos, deviceId) {
		return fetch(Spotify.putBody("https://api.spotify.com/v1/me/player/play?device_id="+deviceId, JSON.stringify({"uris":["spotify:track:"+id]})))
			.then(Spotify.handleErrors)
			.then((data) => {			
				fetch(Spotify.put("https://api.spotify.com/v1/me/player/seek?device_id="+deviceId+"&position_ms="+Math.round(startPos * 1000)))
	    			.then(Spotify.handleErrors)
					.then((data) => {
						Spotify.isPlaying = true;
	  					console.log("start playing "+id + " at " + startPos);
					});  
			});
	},
	handleErrors: function(response) {
	    if (!response.ok) {
	    	if (response.status === 401) {
	    		console.log('no auth');
	    		Spotify.login();
	    	} else {
	        	throw Error(response.statusText);
	        }
	    }
	    return response;
	}
}
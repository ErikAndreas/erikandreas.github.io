"use strict"
const Analyzer = {
	playlistTracks: [],
	playlistTracksLow: [],
	analysis: [],
	outgoing: 0,
	eb: {},
	init: (eb) => {
		Analyzer.eb = eb;
	},
	analyze: async function() {
		// reset any previous analysis (and current playlist tracks)
		Analyzer.playlistTracks = [];
		Analyzer.playlistTracksLow = [];
		Analyzer.analysis = [];
		Analyzer.outgoing = 0;
		Analyzer._getPlaylistTracks(0,100,playlistsHigh.selected,null, Analyzer.playlistTracks);
		Analyzer._getPlaylistTracks(0,100,playlistsLow.selected,null, Analyzer.playlistTracksLow);
		// TODO: check fixTotTime + num of song avail per playlist for enough no songs
	},
	_getPlaylistTracks: async function (offset,limit,playlist,href, playlistTracks) {
		const data = await Spotify.getPlaylistTracks(offset,limit,playlist,href);
		let ids = "";
		Analyzer.outgoing += data.items.length;
		for (let i = 0; i < data.items.length; i++) {
			if (data.items[i].track.is_playable) {
				if (i > 0) ids += ",";
				ids += data.items[i].track.id;
				//console.log(data.items[i]);
				playlistTracks.push(data.items[i].track);
			} else {
				console.log('track not available', data.items[i].track);
				Analyzer.outgoing--;
			}
		}
		Analyzer._getAudioFeatures(ids);
		if (data && data.next) {
			Analyzer._getPlaylistTracks(data.offset + data.limit, data.limit, null, data.next, playlistTracks);
		} else {
			console.log('playlist tracks done ' + outgoing, playlistTracks);
		}
	},
	_getAudioFeatures: async (ids) => {
		const data = await Spotify.getAudioFeatures(ids);
		//console.log(data);
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
					Analyzer.analysis[id] = startAt;
					Analyzer.outgoing--;
					if (0 === Analyzer.outgoing) Analyzer.eb.$emit(EventBus.event.ANALYSIS_DONE, Analyzer.analysis);					
				} catch(error) {
					console.log(error);
				}
			} else {
				Analyzer.analysis[af.id] = lsid;
				Analyzer.outgoing--;				
				console.log("already got " + af.id + " in cache",Analyzer.outgoing);
				if (0 === Analyzer.outgoing) Analyzer.eb.$emit(EventBus.event.ANALYSIS_DONE,Analyzer.analysis);			
			}
		});
	}

}
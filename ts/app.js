"use strict"
let Store = {
	state: {
		stationOut:'isd',
		stationReturn:'',
		stations: [],
		outList: [],
		returnList:[]
	}
};

const EventBus = new Vue({
	data: {
		event: {
			STATION_CHANGED: 'station-changed'
		}
	}
});

Vue.component('station-list', {
	template: `	
			<select v-if="shared.stations.length" v-model="shared.stationOut" v-on:change="stationSelChanged">
				<option v-for="station in shared.stations" v-bind:value="station.value">{{station.text}}</option>
			</select>
			<div v-else-if="!shared.station.length" style="color:red">No devices found, start Spotify on a device and refresh page</div>
			`,
	data: () => {
		return {
			shared:Store.state,
		}
	},
	methods: {
		stationSelChanged() {
			EventBus.$emit(EventBus.event.STATION_CHANGED, this.shared.stationDept);
		}
	}
});

Vue.component('departures-list', {
	template: `<div><ul><li v-bind:class="{departed: t.atstation}" v-for="(t, idx) in shared.outList">
	<span v-bind:class="{cancelled: t.iscancelled}">{{t.scheduled.format('HH:MM')}}</span>
	<span v-if="t.newtime" class="red">{{t.newtime.format('HH:MM')}}</span>
	Spår {{t.track}}
	{{t.owner}}
	<span v-for="d in t.deviation">{{d}} </span>
	<span>{{t.atstation ? t.atstation.format('HH:MM') : ''}}</span>
   </li></ul>
   <ul><li v-bind:class="{departed: t.atstation}" v-for="(t, idx) in shared.returnList">
   <span v-bind:class="{cancelled: t.iscancelled}">{{t.scheduled.format('HH:MM')}}</span>
   <span v-if="t.newtime" class="red">{{t.newtime.format('HH:MM')}}</span>
	Spår {{t.track}}
   {{t.owner}}
   <span v-for="d in t.deviation">{{d}} </span>
   <span>{{t.atstation ? t.atstation.format('HH:MM') : ''}}</span>
  </li></ul>   
   </div>`,
   data: () => {
	   return {
		   shared:Store.state
	   }
   }
})


const View = new Vue({
	// gotcha, cant nest vue instances, root might be instance, childs must be components	
	el: '#viewRoot',
	data: {
		shared:Store.state
	},
	methods: {

	}
});

const App = {
	
	init: async function() {
		console.log('app');

		EventBus.$on(EventBus.event.STATION_CHANGED, (payload) => {
			console.log('event',payload)
			Store.state.stationDept = payload;
		});
		Store.state.outList = await App.getStatus('Kb', 'G', '06:44', '08:00');
		Store.state.returnList = await App.getStatus('G', 'Kb', '14:54', '17:30');
	},
	getStations: async () => {
		let body = "<REQUEST>" +
		// Use your valid authenticationkey
		"<LOGIN authenticationkey='cdfce2be38cb46879c0fd8478c290318' />" +
		"<QUERY objecttype='TrainStation'>" +
			"<FILTER/>" +
			"<INCLUDE>Prognosticated</INCLUDE>" +
			"<INCLUDE>AdvertisedLocationName</INCLUDE>" +
			"<INCLUDE>LocationSignature</INCLUDE>" +
		"</QUERY>" +
	 "</REQUEST>";
		let r = new Request('https://api.trafikinfo.trafikverket.se/v1/data.json',{
			method: 'POST',
			headers: {
				"Content-Type": "text/xml"
			},
			body: body
		});
		let data = await fetch(r);
		console.log(data);
		let res = await data.json();
		console.log(res);
	},
	getStatus: async (from, to, start, end) => {
		let body = `<REQUEST version='1.0'>
		<LOGIN authenticationkey='cdfce2be38cb46879c0fd8478c290318' />
		<QUERY objecttype='TrainAnnouncement' 
			orderby='AdvertisedTimeAtLocation' >
			<FILTER>
			<AND>
				<OR>
					<AND>
						<GT name='AdvertisedTimeAtLocation' 
									value='${start}' />
						<LT name='AdvertisedTimeAtLocation' 
									value='${end}' />
					</AND>
				</OR>
				<EQ name='LocationSignature' value='${from}' />
				<EQ name='ActivityType' value='Avgang' />
				<EQ name='ToLocation.LocationName' value='${to}' />
			</AND>
			</FILTER>
			<INCLUDE>AdvertisedTrainIdent</INCLUDE>
			<INCLUDE>InformationOwner</INCLUDE>
			<INCLUDE>AdvertisedTimeAtLocation</INCLUDE>
			<INCLUDE>Canceled</INCLUDE>
			<INCLUDE>TrackAtLocation</INCLUDE>
			<INCLUDE>Deviation</INCLUDE>
			<INCLUDE>OtherInformation</INCLUDE>
			<INCLUDE>ModifiedTime</INCLUDE>
			<INCLUDE>TimeAtLocation</INCLUDE>
			<INCLUDE>PlannedEstimatedTimeAtLocation</INCLUDE>
			<INCLUDE>EstimatedTimeAtLocation</INCLUDE>
			<INCLUDE>EstimatedTimeIsPreliminary</INCLUDE>
		</QUERY>
		</REQUEST>`;
		let r = new Request('https://api.trafikinfo.trafikverket.se/v1.2/data.json',{
			method: 'POST',
			headers: {
				"Content-Type": "text/xml"
			},
			body: body
		});
		let data = await fetch(r);
		let res = await data.json();
		const out = [];
		if (res.RESPONSE.RESULT) {
			res.RESPONSE.RESULT[0].TrainAnnouncement.forEach((t) => {
				out.push({
					id: t.AdvertisedTrainIdent,
					scheduled: new Date(t.AdvertisedTimeAtLocation),
					deviation: t.Deviation,
					owner: t.InformationOwner,
					lastmodified: new Date(t.ModifiedTime),
					newtime: t.EstimatedTimeAtLocation ? new Date(t.EstimatedTimeAtLocation): null,
					isprelimenary: t.EstimatedTimeIsPreliminary,
					plannedDelay: t.PlannedEstimatedTimeAtLocation,
					iscancelled: t.Canceled,
					otherinfo: t.OtherInformation,
					atstation: (t.TimeAtLocation) ? new Date(t.TimeAtLocation) : null,
					track: t.TrackAtLocation
				});
			});
		}
		//Store.state.outList = out;
		console.log(out);
		return out;
	}
};


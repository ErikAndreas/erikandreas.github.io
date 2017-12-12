"use strict"
// @ts-check
/**
 * https://developers.google.com/web/fundamentals/push-notifications/sending-messages-with-web-push-libraries
 * subscribe user
 * ss: add subsciption to redis 
 * ss: run getStatus, if cancelled or delayed get subsciptions and send push
 * unsubscribe user
 */
let Store = {
	state: {
		stationOut:'isd',
		stationReturn:'',
		stations: [],
		outList: [],
		returnList:[],
		trip: {
			out: {
				from: 'Kb',
				to: 'G',
				start: '06:44',
				end: '08:30',
				notify: false
			},
			return: {
				from: 'G',
				to: 'Kb',
				start: '14:59',
				end: '18:00',
				notify: false
			}
		}
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
	template: `<div>
	<input ref="input" type="time" v-model="shared.trip.out.start"/> - <input ref="input" type="time" v-model="shared.trip.out.end"/> <button @click="getStatusOut">Refresh</button>
	<ul><li v-bind:class="{departed: t.atstation}" v-for="(t, idx) in shared.outList">
	<span v-bind:class="{cancelled: t.iscancelled}">{{t.scheduled.format('HH:MM')}}</span>
	<span v-if="t.newtime" class="red">{{t.newtime.format('HH:MM')}}</span>
	Spår {{t.track}}
	{{t.owner}}
	<span v-for="d in t.deviation">{{d}} </span>
	<span>{{t.atstation ? t.atstation.format('HH:MM') : ''}}</span>
	({{t.lastmodified.format('HH:MM')}})
   </li></ul>
   <input ref="input" type="time" v-model="shared.trip.return.start"/> - <input ref="input" type="time" v-model="shared.trip.return.end"/> <button @click="getStatusReturn">Refresh</button>
   <ul><li v-bind:class="{departed: t.atstation}" v-for="(t, idx) in shared.returnList">
   <span v-bind:class="{cancelled: t.iscancelled}">{{t.scheduled.format('HH:MM')}}</span>
   <span v-if="t.newtime" class="red">{{t.newtime.format('HH:MM')}}</span>
	Spår {{t.track}}
   {{t.owner}}
   <span v-for="d in t.deviation">{{d}} </span>
   <span>{{t.atstation ? t.atstation.format('HH:MM') : ''}}</span>
   ({{t.lastmodified.format('HH:MM')}})
  </li></ul>   
   </div>`,
   data: () => {
	   return {
		   shared:Store.state
	   }
   },
   methods: {
	   getStatusOut() { App.getStatusOut(); },
	   getStatusReturn() { App.getStatusReturn(); }
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
	
	init: async () => {
		console.log('app');

		EventBus.$on(EventBus.event.STATION_CHANGED, (payload) => {
			console.log('event',payload)
			Store.state.stationDept = payload;
		});
		
		App.getStatusOut();
		App.getStatusReturn();
		const registration = await App.registerServiceWorker();
		// not ready on 'prod' (no backend)
		if (window.location.hostname != 'www.nyhren.se') {
			App.askPushPermission();
			App.subscribeUserToPush(registration);
		}
	},
	getStatusOut: async () => {
		Store.state.outList = await App.getStatus(
			Store.state.trip.out.from,
			Store.state.trip.out.to,
			Store.state.trip.out.start,
			Store.state.trip.out.end);
	},
	getStatusReturn: async () => {
		Store.state.returnList = await App.getStatus(
			Store.state.trip.return.from,
			Store.state.trip.return.to,
			Store.state.trip.return.start,
			Store.state.trip.return.end);
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
		const r = new Request('https://api.trafikinfo.trafikverket.se/v1.2/data.json',{
			method: 'POST',
			headers: {
				"Content-Type": "text/xml"
			},
			body: body
		});
		const data = await fetch(r);
		const res = await data.json();
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
		console.log(out);
		return out;
	},
	registerServiceWorker: async () => {
		let registration;
		try {
			registration = await navigator.serviceWorker.register('./psw.js')
			console.log('Service worker successfully registered.');
		} catch(err) {
		  	console.error('Unable to register service worker.', err);
		}
		return registration;		
	},
	askPushPermission: async () => {
		const permissionResult = await Notification.requestPermission();
		if (permissionResult !== 'granted') {
			throw new Error('We weren\'t granted permission.');
		}
		return permissionResult;
	},
	urlBase64ToUint8Array: (base64String) => {
		const padding = '='.repeat((4 - base64String.length % 4) % 4);
		const base64 = (base64String + padding)
		  .replace(/\-/g, '+')
		  .replace(/_/g, '/')
		;
		const rawData = window.atob(base64);
		return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
	},
	// TODO add param out|return to identify which status to get and store on server, unsub removes from out|return on server
	subscribeUserToPush: async (registration) => {
		let subscription = await registration.pushManager.getSubscription();
		if (!subscription) {
			const subscribeOptions = {
				userVisibleOnly: true,
				applicationServerKey: App.urlBase64ToUint8Array('BI2aCJE6JmMHQfTTHprY1l-tob0Kgb7JfKpVTWOrbqtwoiYYmwSoxBDvH9mcbwOteaV5yUR9IlWxNVMyMyUGn-k')
			};
			// registration might not yet be in proper ready state, wait for it...
			await navigator.serviceWorker.ready;
			// subscribe requires notification permission
			subscription = await registration.pushManager.subscribe(subscribeOptions);
			console.info("UA subscribed, will call server to store subscribtion");
			fetch('http://localhost:5000/save-subscription', {
				method: 'POST',
				headers: {
				  'Content-Type': 'application/json'
				},
				body: {"subscription": JSON.stringify(subscription)}
			  });
		}
		//console.log('Got PushSubscription: ', JSON.stringify(subscription));
		return subscription;
	}
};


/* Bunyan — where the phone is, from its time zone
   The sky (js/ui/sky.js) needs a place on the earth. Without asking for the phone's
   location, the time zone is the best there is offline: each zone is named for a city,
   and the city's coordinates stand for it (Africa/Cairo is Cairo). Across a country the
   size of Egypt that puts sunrise within about a quarter of an hour of the true one;
   "Use my location" in Settings → App makes it exact.

   A zone not in the table gives a place on its own meridian (15° a UTC hour) at 30°N:
   the time of day is then right to within the zone's width, the season only roughly,
   and the settings say so ("approximate"). */

var Z={
  "Africa/Cairo":["Cairo",30.044,31.236],"Asia/Riyadh":["Riyadh",24.714,46.675],"Asia/Dubai":["Dubai",25.205,55.271],
  "Asia/Kuwait":["Kuwait City",29.376,47.977],"Asia/Qatar":["Doha",25.285,51.531],"Asia/Bahrain":["Manama",26.229,50.586],
  "Asia/Muscat":["Muscat",23.588,58.383],"Asia/Aden":["Aden",12.785,45.019],"Asia/Amman":["Amman",31.954,35.911],
  "Asia/Beirut":["Beirut",33.894,35.502],"Asia/Damascus":["Damascus",33.514,36.277],"Asia/Baghdad":["Baghdad",33.315,44.366],
  "Asia/Jerusalem":["Jerusalem",31.769,35.216],"Asia/Gaza":["Gaza",31.502,34.467],"Asia/Hebron":["Hebron",31.533,35.095],
  "Asia/Tehran":["Tehran",35.689,51.389],"Asia/Karachi":["Karachi",24.861,67.010],"Asia/Kolkata":["New Delhi",28.614,77.209],
  "Asia/Dhaka":["Dhaka",23.810,90.413],"Asia/Jakarta":["Jakarta",-6.208,106.846],"Asia/Kuala_Lumpur":["Kuala Lumpur",3.139,101.687],
  "Asia/Singapore":["Singapore",1.352,103.820],"Asia/Shanghai":["Shanghai",31.230,121.474],"Asia/Hong_Kong":["Hong Kong",22.320,114.169],
  "Asia/Tokyo":["Tokyo",35.676,139.650],"Asia/Seoul":["Seoul",37.567,126.978],"Asia/Manila":["Manila",14.600,120.984],
  "Asia/Bangkok":["Bangkok",13.756,100.502],"Asia/Tashkent":["Tashkent",41.299,69.240],"Asia/Baku":["Baku",40.409,49.867],
  "Africa/Khartoum":["Khartoum",15.501,32.560],"Africa/Tripoli":["Tripoli",32.887,13.191],"Africa/Tunis":["Tunis",36.806,10.182],
  "Africa/Algiers":["Algiers",36.754,3.059],"Africa/Casablanca":["Casablanca",33.573,-7.590],"Africa/Nouakchott":["Nouakchott",18.079,-15.965],
  "Africa/Mogadishu":["Mogadishu",2.047,45.318],"Africa/Djibouti":["Djibouti",11.589,43.145],"Africa/Addis_Ababa":["Addis Ababa",9.030,38.740],
  "Africa/Nairobi":["Nairobi",-1.292,36.822],"Africa/Lagos":["Lagos",6.524,3.379],"Africa/Johannesburg":["Johannesburg",-26.204,28.047],
  "Europe/Istanbul":["Istanbul",41.008,28.978],"Europe/London":["London",51.507,-0.128],"Europe/Dublin":["Dublin",53.350,-6.260],
  "Europe/Paris":["Paris",48.857,2.352],"Europe/Berlin":["Berlin",52.520,13.405],"Europe/Madrid":["Madrid",40.417,-3.704],
  "Europe/Rome":["Rome",41.903,12.496],"Europe/Amsterdam":["Amsterdam",52.368,4.904],"Europe/Brussels":["Brussels",50.850,4.352],
  "Europe/Vienna":["Vienna",48.208,16.374],"Europe/Zurich":["Zurich",47.377,8.541],"Europe/Stockholm":["Stockholm",59.329,18.069],
  "Europe/Oslo":["Oslo",59.914,10.752],"Europe/Copenhagen":["Copenhagen",55.676,12.568],"Europe/Helsinki":["Helsinki",60.170,24.938],
  "Europe/Warsaw":["Warsaw",52.230,21.012],"Europe/Athens":["Athens",37.984,23.728],"Europe/Lisbon":["Lisbon",38.722,-9.139],
  "Europe/Moscow":["Moscow",55.756,37.617],"Europe/Kiev":["Kyiv",50.450,30.524],"Europe/Kyiv":["Kyiv",50.450,30.524],
  "America/New_York":["New York",40.713,-74.006],"America/Chicago":["Chicago",41.878,-87.630],"America/Denver":["Denver",39.739,-104.990],
  "America/Phoenix":["Phoenix",33.448,-112.074],"America/Los_Angeles":["Los Angeles",34.052,-118.244],"America/Toronto":["Toronto",43.653,-79.383],
  "America/Vancouver":["Vancouver",49.283,-123.121],"America/Mexico_City":["Mexico City",19.433,-99.133],"America/Sao_Paulo":["São Paulo",-23.551,-46.633],
  "America/Argentina/Buenos_Aires":["Buenos Aires",-34.604,-58.382],"America/Bogota":["Bogotá",4.711,-74.072],"America/Lima":["Lima",-12.046,-77.043],
  "Australia/Sydney":["Sydney",-33.869,151.209],"Australia/Melbourne":["Melbourne",-37.814,144.963],"Australia/Perth":["Perth",-31.950,115.860],
  "Australia/Brisbane":["Brisbane",-27.470,153.026],"Pacific/Auckland":["Auckland",-36.848,174.763]};

/* The place for a zone: {name, lat, lon, src:"zone"|"offset"}. stdOffMin: the zone's
   standard offset from UTC in minutes, east positive (for a zone not in the table). */
function zonePlace(zone,stdOffMin){
  var z=Z[zone];
  if(z)return {name:z[0],lat:z[1],lon:z[2],src:"zone"};
  return {name:null,lat:30,lon:Math.max(-180,Math.min(180,(stdOffMin||0)/4)),src:"offset"};}

export {zonePlace};

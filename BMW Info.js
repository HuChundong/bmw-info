// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: blue; icon-glyph: circle;
// BMW Info Widget
//
// Copyright (C) 2021 by me <lobermeier@me.com>
//
// Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL
// IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
// INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER
// IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE
// OF THIS SOFTWARE.
// THIS SOFTWARE IS NOT COPYRIGHTED OR LINKED TO THE BMW AG. LOGO PROVIDED BY WIKIPEDIA, ALL CAR IMAGES COURTESY OF THE BMW AG. 

strings = {}
strings['de'] = {
    'Unable to login':'Login nicht möglich',
    'Invalid Widget parameter. Expected format: username|password':'Widgetparameter ungültig. Erwartetes Format: username|password',
    'SECURED':'Verriegelt',
    'Unknown location':'unbekannter Ort',
    'All doors closed':'Alle Türen geschlossen',
    '00032':'Fahrzeuguntersuchung',  
    '00001':'Bremsflüssigkeit',
    '00100':'Motoröl',
    '00003':'Fahrzeug-Check'
}
strings['en'] = {
    '00032':'car inspection',  
    '00001':'brake fluid check',
    '00100':'engine oil check',
    '00003':'car-Check',
}
const BMW_BASE_URL    = "https://b2vapi.bmwgroup.com"
const BMW_IMAGEURL    = 'https://www.bmw-connecteddrive.de/api/vehicle/image/v1/'
const BMW_ACTIONURL   = 'https://www.bmw-connecteddrive.de/remoteservices/rsapi/v1/'
const BMW_STATUSURL   = 'https://www.bmw-connecteddrive.de/api/vehicle/dynamic/v1/'
// const BMW_STATUSURL   = BMW_BASE_URL + '/webapi/v1/user/vehicles'
const BMW_SPECS_URL   = "https://www.bmw-connecteddrive.de/api/vehicle/specs/v1/"
const BMW_SERVICE_URL = "https://www.bmw-connecteddrive.de/api/vehicle/service/v1/"
const BMW_VEHICLESURL = BMW_BASE_URL + "/user/vehicles"
const BMW_VINURL      = 'https://www.bmw-connecteddrive.de/api/me/vehicles/v2?all=true&brand=BM'
const BMW_REDIRECTURL = 'https://www.bmw-connecteddrive.com/app/default/static/external-dispatch.html'
const BMW_TOKENURL    = 'https://customer.bmwgroup.com/gcdm/oauth/authenticate'
const BMW_TOKENURL2   = BMW_BASE_URL + "/gcdm/oauth/token"
const BMW_CHARGEURL   = 'https://cocoapi.bmwgroup.com/eadrax-chs/v1/charging-sessions?vin='
const BMW_LOGOURL     = "https://upload.wikimedia.org/wikipedia/commons/thumb/4/44/BMW.svg/200px-BMW.svg.png"
const OPENSTREETMAP   = "http://nominatim.openstreetmap.org/reverse?format=json"
const APPLE_MAPS_URL  = "https://maps.apple.com/"
const GOOGLE_MAPS_URL = (latitude, longitude) => `comgooglemaps://?saddr=&daddr=\(${latitude}),\(${longitude})&directionsmode=driving`

const DEFAULT_MODEL   = "your BMW"
// update every 5 minutes
const CACHETIME       = 5

const userKey         = Script.name()+'_cd_user'
const passKey         = Script.name()+'_cd_pass'
const vinKey          = Script.name()+'_vin'
const tokenKey        = Script.name()+'_token'
const buttonSize      = 16
// Farben
const bgColor 		   = Color.dynamic(Color.white(), Color.black());
const fgColor   	   = Color.dynamic(Color.black(),  Color.white());
const flColor  		   = fgColor //.dynamic(Color.lightGray(), Color.darkGray())
// Text Size
const TXT_FONT_SIZE   = 10
let   isSmall		   = config.widgetFamily === 'small'

const DYNTEXTSIZE     = isSmall ? (TXT_FONT_SIZE) : TXT_FONT_SIZE + 1
let widget 		       = new ListWidget()

////////////////////////////////////////////////////////////////////////////////
let widgetInputRAW = args.widgetParameter 
let widgetInput    = null
let user, pass, carData 
let errString      = null



if (widgetInputRAW !== null) {
  [user, pass] = widgetInputRAW.toString().split("|");
  console.log("taking login from parameters")
  if (!user || !pass) {
    errString = localize("Invalid Widget parameter. Expected format: username|password")
  }
  else {  
    Keychain.set(userKey, user)
    Keychain.set(passKey, pass)  
    carData = await getData()
  }
}
else {
  console.log("Trying to get from keychain...")
  if (Keychain.contains(userKey) && Keychain.contains(passKey)) {  
    user = Keychain.get(userKey)
    pass = Keychain.get(passKey)
  }
  else {  
    errString = localize("Invalid Widget parameter. Expected format: username|password")
    console.error(errString)
  }
}
if (config.runsInWidget) {
  carData = await getData()  
  if (carData) {
    if (config.widgetFamily == "small") {
      widget = await createSmallWidget(carData)
    }
    else {
      widget = await createWidget(carData)    
    } 
  }
  else {
    widget = await createErrorWidget(localize("Unable to login") + ", " + errString)
  }  
  Script.setWidget(widget)
  } 
else {  
  const options = ['Small', 'Medium', 'Large', 'Cancel']
  let resp = await presentAlert('Preview Widget', options)
  if (resp==options.length-1) return
  let size = options[resp]
  if (size.match("Test")) {
    carData = await accumulateDatatest()
  }
  else {
    carData = await getData()
  }
  console.warn(carData)
  if (carData) {
    switch (size) {
      case "Small": 
        widget = await createSmallWidget(carData)
        break
      case "Medium":
        widget = await createWidget(carData)
        break
      case "Large":
        widget = await createWidget(carData)
        break
      case "Test":  
        size = "Medium"
        widget = await createWidget(carData)
        break
    }
  }
  else {
    widget = await createErrorWidget(errString)
  }
  Script.setWidget(widget)
  await widget[`present${size}`]()
}
Script.complete() 

// engine and vehicle specs... who needs it
//     let carSpec = await getVehicleSpecs(carData.token, carData.vin)
// Services... who needs it
//     let carService = await getVehicleService(carData.token, carData.vin)
// console.log(carSpec)    



async function accumulateDatatest() {
  let result = {}
  let vinCar
      
  vinCar = await getVin()           
  if (vinCar) {  
    console.log(vinCar.vin + " from test data")
    result.token = undefined
    result.vin = vinCar.vin
    result.brand = "BMW"
    result.carImage = await fetchImage(vinCar.vin)
    result.Logo = await fetchImage("bmwlogo")
    result.charging_status = "50"
    result.chargingSystemStatus = "CHARGINGACTIVE"
    result.chargingTimeRemaining = 6
    result.remaining_fuel = 38
    result.mileage = 27324
    result.chargingLevelHv = 50
    result.beRemainingRangeKm = "199548"
    result.door_lock_state = "unlocked"
    result.updateTime = "24.12.2020 12:50:58 UTC"
    result.lat = 50
    result.lon = 8
    result.LocationName = await getLocationName(result.lat, result.lon)
    result.lastCharge = undefined
    result.isElectric = true
  } else {
      result.error = "unable to get your vin"
  }  
  return result
}



function getPostBody(input) {
    let result = ''
    Object.keys(input).map((key)=>{
        result = result + '&' + key + '=' + encodeURIComponent(input[key])
        })
    return result
}

function localize(text) {
    let lng = Device.language()
    if ((strings[lng]) && (strings[lng][text])) {
        return strings[lng][text]
    } else 
        return text
}

async function accumulateData() {
    let result = {}
    let vinCar
    let token = await getLoginToken()
    console.log(token)
    if (token != undefined) {
       result.token = token  
        vinCar = await getVin(token)           
        if (vinCar) {
            result.vin = vinCar.vin
            result.CarName = vinCar.licensePlate
            result.carImage = await fetchImage(vinCar.vin)
            result.Logo = await fetchImage("bmwlogo")
            result.modelName = vinCar.modelName || DEFAULT_MODEL
            result.brand = vinCar.brand || "BMW"
            result.bodyType = vinCar.bodyType
            result.doorCount = vinCar.doorCount
            let data = await getVehicleStatus(token,vinCar.vin)
            console.log(data)
            if (data) {
                result.charging_status = data.charging_status
                result.chargingSystemStatus = data.chargingSystemStatus
                result.chargingTimeRemaining = data.chargingTimeRemaining
                result.chargingLevelHv = data.chargingLevelHv
                result.remaining_fuel = data.remaining_fuel
                result.condition_based_services = data.condition_based_services
                result.door_driver_front = data.door_driver_front == "CLOSED"
                result.door_driver_rear = data.door_driver_rear == "CLOSED"
                result.door_passenger_front = data.door_passenger_front == "CLOSED"
                result.door_passenger_rear = data.door_passenger_rear == "CLOSED"
                
                result.mileage = data.mileage
                result.beRemainingRangeKm = data.beRemainingRangeElectricKm || data.beRemainingRangeFuelKm
                result.door_lock_state = data.door_lock_state
                result.updateTime = data.updateTime
                result.lat = data.gps_lat
                result.lon = data.gps_lng
                result.LocationName = await getLocationName(result.lat, result.lon)  
                let nowDate = new Date()
                result.lastUpdate = nowDate
                let chg = await getlastCharge(token,vinCar.vin,nowDate)
                if (chg.latest === undefined) {
// maybe we have a new month and the uses hasnt chargd yet so go one month back
                    nowDate.setDate(1)
                    let month = nowDate.getMonth()
                    if (month === 0) { // Special in january go also one year back
                        nowDate.setMonth(11) // 
                        nowDate.setFullYear(nowDate.getFullYear()-1)
                    } else {
                        nowDate.setMonth(nowDate.getMonth() - 1)
                    }
                    chg = await getlastCharge(token,vinCar.vin,nowDate)
                }
                result.lastCharge = chg.latest
                result.isElectric = chg.latest != undefined

            } else {
                result.error = 'unable to fetch data'
            }
        } else {
            result.error = 'unable to get your vin'
        }
    } else {
        result.loginError = true
        result.error = 'unable to login or to read from cache'
    }
    return result
}
// get Data either from Cache or online
async function getData() {
  const fm = FileManager.local()
  const cachePath = fm.joinPath(fm.cacheDirectory(), Script.name() + "_cache.json")
  const cacheExists = fm.fileExists(cachePath)
  const cacheDate = cacheExists ? fm.modificationDate(cachePath) : 0
  console.log("cache file from " + cacheDate.toString())
  let today = new Date()
  let data, e
  
  if (!config.runsInApp && cacheExists && (today.getTime() - cacheDate.getTime()) < (CACHETIME * 60 * 1000)) {
    console.log("Get from Cache")
    data = JSON.parse(fm.readString(cachePath))
    data.carImage = await fetchImage(data.vin)
    data.Logo = await fetchImage("bmwlogo")
    data.lastUpdate = cacheDate
  } 
  else {
    console.log("Get from Website")
    try {
      data = await accumulateData()
      if (!data.loginError) {
        fm.writeString(cachePath, JSON.stringify(data))
        console.log("Write to Cache")
      }
      else {
        return false
      }
    } 
    catch (e) {
      console.error('Fetching data from website failed:')
      console.error(e)
      if (cacheExists) {
        console.warn('Fallback to Cache')
        data = JSON.parse(fm.readString(cachePath))
        data.carImage = await fetchImage(data.vin)
        data.Logo = await fetchImage("bmwlogo")
        data.lastUpdate = cacheDate
      } 
      else {
        return false
        
      }
    }
  }
  return data
}

// gets the location name from given coordinates using openstreetmap
async function getLocationName(lat,lng) {
  let url = OPENSTREETMAP + "&lat=" + lat.toString() + "&lon=" + lng.toString() + "&addressdetails=1"
  let req = new Request(url)
  let data = await req.loadJSON() 
  if (data) {  
    let adrStr = data.address.town 
    adrStr += data.address.road.length ? ", " + data.address.road : ""
    adrStr += data.address.house_number ? " " + data.address.house_number : ""
    adrStr += data.address.amenity ? ", " + data.address.amenity : ""
    return adrStr
  }
    else {
      return localize("Unknown location")
  }
}

// Kleines Layout
async function createSmallWidget(data) {  
  const defSpace = 1
  const row = widget.addStack()
  const smallStack = row.addStack()
  row.addSpacer(4) 
  const smallRight = smallStack.addStack()
  smallRight.layoutVertically()
  let iconRow = smallRight.addStack()
  let logo = addSymbol(iconRow, data.Logo, 20)
  logo.centerAlignImage()
  iconRow.addSpacer(5)
  let titleText = data.modelName
  let txt = addText(iconRow, titleText, "left")
  txt.font = Font.boldSystemFont(DYNTEXTSIZE +2)
  
  smallRight.addSpacer(3)
  const carImageStack = smallRight.addStack()
  carImageStack.layoutHorizontally()
  carImageStack.setPadding(-40, 0, -30, 0)
  row.addSpacer(1)
  widget.setPadding(7, 7, 7, 7)
  const wimg = carImageStack.addImage(data.carImage)
  wimg.imageSize = new Size(120, 120)
  wimg.rightAlignImage()
  wimg.url = APPLE_MAPS_URL + "?q=" + data.modelName.replace(" ", "_") + "&ll="+ data.lat+','+data.lon    
  widget.url = wimg.url
// display car Location    
  CreateButton(smallRight, 'location', data.LocationName, false, false, 15,"",DYNTEXTSIZE)
// Lock State Stack  
  iconRow.addSpacer()
  let lockIcon = addSymbol(iconRow, (data.door_lock_state === 'SECURED') ? 'lock.shield' : 'lock.open', 15,"",DYNTEXTSIZE)
  lockIcon.tintColor = (data.door_lock_state === 'SECURED') ? fgColor : Color.red()
// Range stack  
  let rangeStack = CreateButton(smallRight, 'ruler', Math.floor(data.beRemainingRangeKm) +'km', false, false, 15,"",DYNTEXTSIZE)
  rangeStack.addSpacer()
  CreateButton(rangeStack, 'gauge', Math.floor(data.remaining_fuel) +' L', false, false, 15,"",DYNTEXTSIZE)
  smallRight.addSpacer(defSpace)
// Use the utc and convert to local time
  let dtTime = CreateButton(smallRight, "calendar", formatDate(false, data.updateTime), false, false, 15,"",DYNTEXTSIZE)  
//   dtTime.addSpacer()
  let timeTxt = dtTime.addDate(data.lastUpdate)
  timeTxt.applyTimeStyle()
  timeTxt.font = Font.systemFont(DYNTEXTSIZE-3)
  timeTxt.textColor = Color.lightGray()
  timeTxt.centerAlignText()
  return widget
}

// Use the utc and convert to local time
function formatDate(isCharging, updateTime, chargingTime) {
  let df = new DateFormatter()
  let date
  if (isCharging) {
    let now = new Date() // calculate the charging end time based on the remaining minutes
    date = new Date(now.getTime()+parseInt(chargingTime)*60000)
  } 
  else {
    df.dateFormat = 'dd.MM.yyyy HH:mm:ss Z'
    if (updateTime) {
      date = df.date(updateTime)
    }
  }
  df.useShortDateStyle()
  df.useShortTimeStyle()    
  return df.string(date)
}

// large & medium layout
async function createWidget(data) {  
  let isLarge = config.widgetFamily === 'large'
//   isLarge = true
  const medSpace = isLarge ? 10 : 7
  const LARGETXT_SIZE = isLarge ? DYNTEXTSIZE +2 : DYNTEXTSIZE
  widget.setPadding(10, 10, 10, 0)
  const top = widget.addStack()
    top.setPadding(10, 0, 0, 10)
    let logo  = top.addImage(data.Logo)
    logo.imageSize = new Size(22, 22)
    top.addSpacer(2*medSpace)
    let txt = addText(top,data.brand + " " + data.modelName,"left")
    txt.font = Font.boldSystemFont(LARGETXT_SIZE + 2)
    if (data.CarName) {
      let cn = addText(top, ": '" +data.CarName + "'","left")  
      cn.font = Font.boldSystemFont(LARGETXT_SIZE + 2)
    }
    top.addSpacer()
    lockIcon = addSymbol(top, (data.door_lock_state === 'SECURED') ? 'lock.shield' : 'lock.open', 20,"",14)
    lockIcon.tintColor = (data.door_lock_state === 'SECURED') ? fgColor : Color.red()
  const row = widget.addStack()
  const left = row.addStack()
    left.layoutVertically()
    left.addSpacer(medSpace)
    CreateButton(left, 'location', data.LocationName, false, false, 15,"",LARGETXT_SIZE)
    left.addSpacer(medSpace)
    let rangeStack = CreateButton(left, 'ruler', Math.floor(data.beRemainingRangeKm) +'km', false, false, 15,"",LARGETXT_SIZE)
      rangeStack.addSpacer(15)
      CreateButton(rangeStack, 'gauge.badge.minus', Math.floor(data.remaining_fuel) +' L', false, false, 15,"",LARGETXT_SIZE)
    left.addSpacer(medSpace)
    CreateButton(left, 'gauge', Math.floor(data.mileage) +'km', false, false, 15,"",LARGETXT_SIZE)
    left.addSpacer(medSpace)
  
    let allClosed = data.door_driver_front && data.door_passenger_front && data.door_driver_rear && data.door_passenger_rear
    if (allClosed) {
      CreateButton(left, "lock.square.stack", localize("All doors closed"), false, false, 15,"",LARGETXT_SIZE)
    }
    else {
      let infoText = !data.door_driver_front ? "Fahrertür" : ""
      infoText += !data.door_passenger_front ? ", Beifahrertür" : ""
      infoText += !data.door_driver_rear ? ", Tür hinten links" : ""
      infoText += !data.door_passenger_rear ? ", Tür hinten rechts" : ""
      infoText += infoText.length > 0 ? "offen." : ""
      CreateButton(left, "exclamationmark.square", localize(infoText), false, false, 15,"",LARGETXT_SIZE)
    }
      
    left.addSpacer(medSpace)
// large layout: show next service dates
  if (isLarge) {
      
    let serviceStack = widget.addStack()
    serviceStack.addSpacer(2*medSpace)
    serviceStack.addImage(drawHorizontalLine(120))
    serviceStack.addSpacer(medSpace)
    serviceStack.layoutVertically()
    let services = data.condition_based_services.split(";")
    for (let i =0; i < services.length; i++) {
      let sngService = services[i].split(",")
      let serviceTxt = ""
      for (let ct = 0; ct < sngService.length; ct++) {
        switch (ct) {
          case 0:
            serviceTxt = localize(sngService[ct])
            break
          case 1:
            break
          case 2:
            serviceTxt += ": " + sngService[ct]
            break
          case 3:
            if (sngService[ct]) {
              serviceTxt += " / " + sngService[ct] + "km"
            }
            break
        }
      }
      CreateButton(serviceStack, "checkmark.square", serviceTxt, false, false, 15,"",LARGETXT_SIZE)
      serviceStack.addSpacer(medSpace)
    }
  }
// Car Image  
  row.addSpacer()  
  const right = row.addStack()
    right.layoutVertically()
    let vimg = right.addImage(data.carImage)
    vimg.imageSize = new Size(300, 300)
    vimg.rightAlignImage()
    right.setPadding(-80, -30, -90, -130)
// Use the utc and convert to local time  
//   left.addSpacer()
  let dtTime = CreateButton(left, "calendar", formatDate(false, data.updateTime), false, false, 15,"",LARGETXT_SIZE)
  dtTime.addSpacer()
  let timeTxt = dtTime.addDate(data.lastUpdate)
  timeTxt.applyTimeStyle()
  timeTxt.font = Font.systemFont(LARGETXT_SIZE)
  timeTxt.textColor = Color.lightGray()
  timeTxt.centerAlignText()
  return widget
}

async function getVehicleImage(vin) {
  console.log("get image from: " + vin)
    let vehicleImageListUrl = BMW_IMAGEURL + vin + '?startAngle=0&stepAngle=10&width=780'
    let vehicleImageListRequest = new Request(vehicleImageListUrl)
    vehicleImageListRequest.method = 'get'
    vehicleImageListRequest.headers = {'Content-Type': 'application/json'}   
    let data = await vehicleImageListRequest.loadJSON()
    console.log(data)
    if ((data) && (data.angleUrls)) {
        return data.angleUrls[5].url
    } else {
        return false
    }
}

async function getCarInformation(url, token,vin) {

  let vehicleDataUrl = BMW_STATUSURL + vin + '?offset=-60'
  let vehicleDataRequest = new Request(vehicleDataUrl)
  vehicleDataRequest.method = 'get'
  vehicleDataRequest.headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
  }   
  let data = await vehicleDataRequest.loadJSON()
  if (data) {
    return data.attributesMap
  } else {
      return (false)
  }
}
    

async function getVehicleStatus(token,vin) {
    
  let vehicleDataUrl = BMW_STATUSURL + vin + '?offset=-60'
  let vehicleDataRequest = new Request(vehicleDataUrl)
  vehicleDataRequest.method = 'get'
  vehicleDataRequest.headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
  }   
  let data = await vehicleDataRequest.loadJSON()
  if (data) {
    return data.attributesMap
  } else {
      return (false)
  }
}

async function getVehicleSpecs(token,vin) {
    
  let vehicleDataUrl = BMW_SPECS_URL + vin
  let vehicleDataRequest = new Request(vehicleDataUrl)
  vehicleDataRequest.method = 'get'
  vehicleDataRequest.headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
  }   
  let data = await vehicleDataRequest.loadJSON()
  if (data) {
    return data
  } else {
      return (false)
  }
}

async function getVehicleService(token,vin) {
    
  let vehicleDataUrl = BMW_SERVICE_URL + vin
  let vehicleDataRequest = new Request(vehicleDataUrl)
  vehicleDataRequest.method = 'get'
  vehicleDataRequest.headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
  }   
  let data = await vehicleDataRequest.loadJSON()
  if (data) {
    return data
  } else {
      return (false)
  }
}


// get the vehicle information number and other basic 
// data as model and brand
// data is cached
async function getVin(token) {
  let result = {}
  let fm = FileManager.iCloud()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, Script.name() + '.json')
//  fm.remove(path)
  if (fm.fileExists(path)) {
      await fm.downloadFileFromiCloud(path)
      result = JSON.parse(fm.readString(path))
      console.log("vin data from cached file")
      return result
      
  } else {
      console.log('using vin from cd')
      let vehicleListUrl = BMW_VINURL
      let vehicleListRequest = new Request(vehicleListUrl)
      vehicleListRequest.method = 'get'
      vehicleListRequest.headers = {
          'Authorization': 'Bearer ' + token,
          'Content-Type': 'application/json'
      }   
      let list = await vehicleListRequest.loadJSON()
      console.log (list)
      if (list.length > 0) {
          
          fm.writeString(path, JSON.stringify(list[0]))
          Keychain.set(vinKey, result.vin)
          return result
      } else { 
          return false
      }
    }
}

async function getlastCharge(token,vin,date) {
  let result = {}
  result.latest = undefined
  
  let df = new DateFormatter()
  df.dateFormat = 'yyyy-MM'
  let thisMonth = df.string(date) + '-01T00:00:00.000'
  let chargeSessionUrl = BMW_CHARGEURL + vin + '&date=' + thisMonth
  let vehicleChargeRequest = new Request(chargeSessionUrl)
  vehicleChargeRequest.method = 'get'
  vehicleChargeRequest.headers = {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
  }   
  let list = await vehicleChargeRequest.loadJSON()
  if (list.chargingSessions !== undefined) {
      result.nrj = list.chargingSessions.total
  
      if ((list.chargingSessions.sessions) && (list.chargingSessions.sessions.length > 0)) {
          let latest = list.chargingSessions.sessions[0]
          result.latest = latest.title + '|' + latest.energyCharged 
      }
  } 
  return result
}

async function getLoginToken() {
let user
let pwd 
try {
    if (!Keychain.contains(userKey)) {
        console.error('missing parameters')
    } else {
        user = Keychain.get(userKey)
        pwd = Keychain.get(passKey)
    }    
        let url = BMW_TOKENURL
        let post_data = {
            'state': 'eyJtYXJrZXQiOiJkZSIsImxhbmd1YWdlIjoiZGUiLCJkZXN0aW5hdGlvbiI6ImxhbmRpbmdQYWdlIn0',
            'username': user,
            'client_id': 'dbf0a542-ebd1-4ff0-a9a7-55172fbfce35',
            'password': pwd,
            'redirect_uri': BMW_REDIRECTURL,
            'response_type': 'token',
            'scope': 'authenticate_user fupo',
            'locale': 'DE-de'
        }
        let lRequest = new Request(url)
        lRequest.method = 'POST'
        lRequest.body = getPostBody(post_data)
        let result = await lRequest.load()
        
        let tokenUrl = lRequest.response.url
        if (tokenUrl) {
            let match = tokenUrl.match(/&access_token=([a-zA-z0-9]{0,})/)
            if (match != null) {
                let token = match[1]
                Keychain.set(tokenKey, token)
                return token
            } 
        }
        
    } catch(e) {
        console.error(e)
  }
  return null
}


async function fetchImage(vin) {
  
  let fm = FileManager.iCloud()
  let dir = fm.documentsDirectory()
  let path = fm.joinPath(dir, vin + '.png')
 
  if (fm.fileExists(path)) {
      await fm.downloadFileFromiCloud(path)
      console.log("Image " + vin + " aus lokaler Datei.")
      return fm.readImage(path)
  } else {
      let carImageUrl = (vin == "bmwlogo") ? BMW_LOGOURL : await getVehicleImage(vin)
      console.log(carImageUrl)
      let carImageRequest = new Request(carImageUrl)
      let carImage = await carImageRequest.loadImage()
      fm.writeImage(path, carImage)
      return carImage
    }
}
  
//------------------------------------------------
function addSymbol(container, name, size, bCenter) {
  let icon
  if (typeof(name)==="string") {
    const sfIcon = SFSymbol.named(name)
    const fIcon = sfIcon.image
    icon = container.addImage(fIcon)
    icon.tintColor = fgColor
  }
  else {
    try {
      icon = container.addImage(name)
    }
    catch (e) {
      return false
    }
  }
  icon.imageSize = new Size(size,size)
//   if (bCenter) { icon.centerAlignImage() }
  return icon
}

//------------------------------------------------
function addText(container, text, align, size = 10, font) {
  const txt = container.addText(text)
  txt[`${align}AlignText`]()
  txt.font = font ?  new Font(font, size) : Font.systemFont(size)
  txt.textColor = fgColor
  return txt
}

function CreateButton(stack, sfIcon, text ="", alignVertically, bHasFrame = false, iconSize = 20, url, txtSize = TXT_FONT_SIZE) {
  let icon                      
  let cStack = stack.addStack()
  if (alignVertically) cStack.layoutVertically() 
  if (bHasFrame) {
    cStack.borderColor=flColor
    cStack.borderWidth=1
    cStack.cornerRadius = iconSize / 4;  
    cStack.setPadding(iconSize/ 2, iconSize / 2, iconSize / 2, iconSize / 2)
  }
  if (sfIcon) {
    icon = cStack.addImage(SFSymbol.named(sfIcon).image)
    icon.tintColor = flColor  
    icon.url = url  
    icon.imageSize = new Size(iconSize, iconSize)
    cStack.addSpacer(5)
  }
  if (text.length > 0) {
    let txt = cStack.addText(text)
    txt.font = Font.systemFont(txtSize)
  }
  else {
    if (bHasFrame) {
      cStack.setPadding(iconSize, iconSize, iconSize, iconSize)
    }
  }
  cStack.addSpacer(6)
  return cStack
}

// Draw the horizontal line.
function drawHorizontalLine(width) {
  const height = 1
  let draw = new DrawContext()
  let barPath = new Path()
  draw.opaque = false
  draw.respectScreenScale = true
  draw.size = new Size(width,height)
  barPath.addRect(new Rect(0, 0, width, height), width/2, width/2)
  draw.addPath(barPath)
  draw.setFillColor(Color.darkGray())
  draw.fillPath()
  return draw.getImage()
}

//------------------------------------------------
async function presentAlert(prompt,items,asSheet) 
{
  let alert = new Alert()
  alert.message = prompt
  
  for (const item of items) {
    alert.addAction(item)
  }
  let resp = asSheet ? 
    await alert.presentSheet() : 
    await alert.presentAlert()
  return resp
}
  
//------------------------------------------------
async function createErrorWidget(errorText) {
  console.warn("im Error widget")
  const widget = new ListWidget()
  addSymbol(widget, "wifi.exclamationmark", 20, true)   
  widget.addSpacer()
  let errText = widget.addText(errorText || "No reason found") 
  errText.font = Font.systemFont(12)
  errText.textColor = Color.red()

  widget.addSpacer()
  return widget
}
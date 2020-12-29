
//app.js
App({
  onLaunch: function () {
    // 展示本地存储能力
   // var logs = wx.getStorageSync('logs') || []
   // logs.unshift(Date.now())
   // wx.setStorageSync('logs', logs)
    //this.usrserviceuuid = wx.getStorageSync('usrserviceuuid') || "0000FFE0-0000-1000-8000-00805F9B34FB"
    
  },saveSetting(time,text){
    wx.setStorageSync('autoSendInv', time)
    wx.setStorageSync('sendText', text)
    console.log("WriteSetting ", time, text)
  },savelastsel(sel){
    wx.setStorageSync('lastsel', sel)
    console.log("Writelastsel ", sel)
  },
  globalData: {
    mserviceuuid: "0000FFE0-0000-1000-8000-00805F9B34FB",
    mtxduuid: "0000FFE1-0000-1000-8000-00805F9B34FB",
    mrxduuid: "0000FFE1-0000-1000-8000-00805F9B34FB",
    muuidSel: 0,
    mautoSendInv:10,
    msendText:"123",
    ble_device:null,
  }

})
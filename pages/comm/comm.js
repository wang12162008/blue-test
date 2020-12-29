
// pages/comm/comm.js
var app = getApp();
var timer;
var autoTimer;
function inArray(arr, key, val) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i][key] === val) {
      return i;
    }
  }
  return -1;
}
// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)+" "
    }
  )
  return (hexArr.join('')).toUpperCase();
}
function ab2Str(arrayBuffer){
  let unit8Arr = new Uint8Array(arrayBuffer);
  let encodedString = String.fromCharCode.apply(null, unit8Arr);
  //var decodedString = decodeURIComponent(mencode.encodeURIComponent((encodedString)));//没有这一步中文会乱码
  //var decodedString = mencode.encodeURIComponent((encodedString));
  //console.log(decodedString);
  //return decodedString
  return encodedString
}
function stringToBytes(str) {
  var ch, st, re = [];
  for (var i = 0; i < str.length; i++) {
    ch = str.charCodeAt(i);  // get char  
    st = [];                 // set up "stack"  
    do {
      st.push(ch & 0xFF);  // push byte to stack  
      ch = ch >> 8;          // shift value down by 1 byte  
    }
    while (ch);
    // add stack contents to result  
    // done because chars have "wrong" endianness  
    re = re.concat(st.reverse());
  }
  // return an array of bytes  
  return re;
}

Page({
  /**
   * 页面的初始数据
   */
  data: {
    device:null,
    connected: false,
    readyRec:false,
    hexSend:false,
    hexRec:false,
    chs: [], 
    deviceadd:"  ",
    windowHeight: 0,// 页面总高度将会放在这里
    navbarHeight: 0,// navbar的高度
    headerHeight: 0,// header的高度
    scrollViewHeight: 300, // scroll-view的高度
    recdata:"",
    rxCount:0,
    txCount:0,
    rxRate:0,
    txRate:0,
    connectState:"正在连接",
    reconnect:"连接中...",
    timRX:0,
    timTX:0,
    sendText:"",
    autoSendInv:50,
    autosendEn:false,
    autosendText:"自动发送",
    showModal:false,
    showModalStatus:false,
    showTips:"",
  }, goclear(){
    this.setData({
      recdata: "",
      rxCount: 0,
      txCount: 0,
    })
  }, Countdown() {
    var that = this;
    timer = setTimeout(function () {
      //console.log("----Countdown----");
      that.setData({
        rxRate: that.data.timRX*2,
        txRate: that.data.timTX*2,
      })
      that.setData({
        timRX: 0,
        timTX: 0,
      })
      that.Countdown();
    }, 500);
  }, autoSend() { //定时发送
    var that = this;
    if (this.data.connected){
      this.data.autosendEn = true
      autoTimer = setTimeout(function () {
        that.autoSend();
        that.gosend();
      }, this.data.autoSendInv);
  }else{   //已经断开了连接  禁止自动 发送
      this.data.autosendEn = false
      clearTimeout(autoTimer);
      this.setData({
        autosendText: "自动发送"
      })
  }
  }, preventTouchMove: function () {
  },
  goautosend(){
    if (!this.data.connected) {
      this.showModalTips("请先连接BLE设备...")
      return
    }
    if (!this.data.autosendEn){
      this.autoSend();
      this.setData({
        autosendText: "停止发送"
      })
    }else{
      this.data.autosendEn = false
      clearTimeout(autoTimer);
      this.setData({
        autosendText: "自动发送"
      })
    }

  }, voteTitle: function (e) {
    this.data.sendText = e.detail.value;
  },
  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    console.warn("onHide goto disconnect")
    if (this.data.connected) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId
      })
      this.setData({
        connected: false,
        reconnect: "重新连接",
        connectState: "已断开",
      })
      wx.setNavigationBarTitle({
        title: "已断开 " + this.data.device.name
      })
      console.warn("DisConnect ", this.data.deviceId)
    }
  },
    /**
   * 生命周期函数--监听页面卸载
   */
   onUnload: function () {
     app.saveSetting(this.data.autoSendInv, this.data.sendText)
     if (this.data.connected) {
       wx.closeBLEConnection({
         deviceId: this.data.deviceId
       })
       console.warn("DisConnect ", this.data.deviceId)
       this.data.connected=false
     }
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    //app.readSetting()
    this.data.device = app.globalData.ble_device
    this.data.readyRec = false
    this.setData({
      autoSendInv : app.globalData.mautoSendInv,
      sendText : app.globalData.msendText,
    })
   // console.log("start ", this.data.autoSendInv, this.data.sendText)
    this.Countdown() 
    //this.showModalTips("开始连接设备....")
    if (this.data.device == null){
      this.calScrolHigh()
      return
    }
    const deviceId = this.data.device.deviceId
    this.setData({
      deviceadd: "MAC " + deviceId
    })
    this.calScrolHigh()
    const name = this.data.device.name
    console.log("device = ", this.data.device)
    this.serviceu = app.globalData.mserviceuuid.toUpperCase()
    this.txdu = app.globalData.mtxduuid.toUpperCase()
    this.rxdu = app.globalData.mrxduuid.toUpperCase()
    console.log("target uuids = ",this.serviceu,this.txdu,this.rxdu)
    wx.setNavigationBarTitle({
      title: "正在连接 " + this.data.device.name
    })
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        this.setData({
          connected: true,
          name,
          deviceId,
          connectState: "读取服务",
          reconnect:"断开连接"
        })
        wx.setNavigationBarTitle({
          title: "已连接 " + this.data.device.name
        })
        //this.showModalTips("读取BLE所有服务")
        this.getBLEDeviceServices(deviceId)
      }
    })

  },calScrolHigh(){
    var that = this
    // 先取出页面高度 windowHeight
    wx.getSystemInfo({
      success: function (res) {
        that.setData({
          windowHeight: res.windowHeight
        });
      }
    });
    // 然后取出navbar和header的高度
    // 根据文档，先创建一个SelectorQuery对象实例
    let query = wx.createSelectorQuery().in(this);
    // 然后逐个取出navbar和header的节点信息
    // 选择器的语法与jQuery语法相同
    query.select('#v1').boundingClientRect();
    query.select('#v2').boundingClientRect();
    query.select('#v3').boundingClientRect();
    query.select('#v4').boundingClientRect();
    query.select('#v5').boundingClientRect();
    // 执行上面所指定的请求，结果会按照顺序存放于一个数组中，在callback的第一个参数中返回
    query.exec((res) => {
      // 分别取出navbar和header的高度
      let navbarHeight = res[0].height + res[4].height;
      let headerHeight = res[1].height + res[2].height + res[3].height+15;
      // 然后就是做个减法
      let scrollViewHeight = this.data.windowHeight - navbarHeight - headerHeight;
      // 算出来之后存到data对象里面
      this.setData({
        scrollViewHeight: scrollViewHeight
      });
    });
    } ,
  getBLEDeviceServices(deviceId) {
    var that = this
    this.data.readyRec = false
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        var isService = false
        console.log("service size = ", res.services.length)
        for (let i = 0; i < res.services.length; i++) {
         // if (res.services[i].isPrimary) {
          if (this.serviceu == res.services[i].uuid){
            //this.showModalTips(this.serviceu+"\r找到服务UUID，正在读取所有特征值")
            isService = true
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            this.setData({
              connectState: "获取特征值"
            })
            }
        }
        if (!isService){ //没有找到服务
          this.setData({
            connectState: "UUID错误"
          })
          this.showModalTips(this.serviceu +"\r找不到目标服务UUID  请确认UUID是否设置正确或重新连接")
        }
      }
    })
  },
  getBLEDeviceCharacteristics(deviceId, serviceId) {
   const that = this
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        var ismy_service = false
        console.log("compute ", serviceId, this.serviceu)
        if (serviceId == this.serviceu) {
          ismy_service = true
          console.warn("this is my service ")
        }
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (ismy_service){
            console.log("-----------------------")
          }
          console.log("this properties = ", item.properties)
          if (item.properties.read) {
            console.log("[Read]", item.uuid)
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            console.log("[Write]",item.uuid)
            this._deviceId = deviceId
            if (ismy_service && (this.txdu == item.uuid)){
              console.warn("find write uuid  ready to ", item.uuid)
              this._characteristicId = item.uuid
              this._serviceId = serviceId
             // this.showModalTips(this.txdu+ "\r找到发送特征值")
            }
            //this.writeBLECharacteristicValue()
          }
          if (item.properties.notify || item.properties.indicate) {
            console.log("[Notify]", item.uuid)
            if (ismy_service && (this.rxdu == item.uuid)){
              console.warn("find notity uuid try enablec....", item.uuid)
             // this.showModalTips(this.rxdu + "\r正在开启通知...")
              wx.notifyBLECharacteristicValueChange({  //开启通知
                deviceId,
                serviceId,
                characteristicId: item.uuid,
                state: true, 
                success(res) {
                  console.warn('notifyBLECharacteristicValueChange success', res.errMsg)
                  that.setData({
                    connectState: "连接成功"
                  })
                 // that.showModalTips(that.rxdu + "\r开启通知成功")
                  that.data.readyRec=true
                }
              })
            }
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      var buf = new Uint8Array(characteristic.value)
      var nowrecHEX = ab2hex(characteristic.value)
      console.warn("rec: ", nowrecHEX, characteristic.characteristicId)
      var recStr = ab2Str(characteristic.value)
      console.warn("recstr: ", recStr, characteristic.characteristicId)
      if (this.rxdu != characteristic.characteristicId){
        console.error("no same : ", this.rxdu, characteristic.characteristicId)
        return
      }
      if (!this.data.readyRec)return
      var mrecstr
      if (this.data.hexRec){
        mrecstr = nowrecHEX
      }else{
        mrecstr = recStr
      }
      if (this.data.recdata.length>3000){
        this.data.recdata = this.data.recdata.substring(mrecstr.length, this.data.recdata.length)
      }
      console.warn("RXlen: ", buf.length)
      this.setData({
        recdata: this.data.recdata + mrecstr,
        rxCount: this.data.rxCount + buf.length,
        timRX: this.data.timRX+buf.length
      })
    })
  },
  writeBLECharacteristicValue() {
    // 向蓝牙设备发送一个0x00的16进制数据
    let buffer = new ArrayBuffer(1)
    let dataView = new DataView(buffer)
    dataView.setUint8(0, Math.random() * 255 | 0)
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._deviceId,
      characteristicId: this._characteristicId,
      value: buffer,
    })
  },
  gotoback:function(){
    if (this.data.device == null){
      wx.navigateTo({
        url: '/pages/index/index',
      })
       return
    }
    clearTimeout(timer)
    wx.closeBLEConnection({
      deviceId: this.data.deviceId
    })
    this.setData({
      connected: false,
      chs: [],
    })
    wx.navigateBack({
      delta: 1
    })
  }, 
  sendright(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = "R" //要发送的数据
    var buffer1
    //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  },
  sendstop(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = "S" //要发送的数据
    var buffer1
    //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  },
  senddown(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = "D" //要发送的数据
    var buffer1
    //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  },
  sendup(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = "U" //要发送的数据
    var buffer1
    //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  },
  sendleft(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = "L" //要发送的数据
    var buffer1
    //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  },
  
  
  
  
  gosend(){
    if (!this.data.connected){
      this.showModalTips("请先连接BLE设备...")
      return
    }
    var that = this;
    var hex = this.data.sendText //要发送的数据
    var buffer1
    if (this.data.hexSend){ //十六进制发送
      
      var typedArray = new Uint8Array(hex.match(/[\da-f]{2}/gi).map(function (h) {
        return parseInt(h, 16)
      }))
      console.log("hextobyte ", typedArray)
      buffer1 = typedArray.buffer
    }else{ //string发送
      var strbuf = new Uint8Array(stringToBytes(hex))
      console.log("strtobyte ", strbuf)
      buffer1 = strbuf.buffer
    }
    console.log("Txbuf = ",buffer1)
    if (buffer1==null)return
    const txlen = buffer1.byteLength
    wx.writeBLECharacteristicValue({
      deviceId: that._deviceId,
      serviceId: that._serviceId,
      characteristicId: that._characteristicId,
      value: buffer1,
      success: function (res) {
        // success
        that.setData({
          txCount: that.data.txCount + txlen,
          timTX:that.data.timTX+txlen
        })
        console.log("success  指令发送成功");
        console.log(res);
      },
      fail: function (res) {
        // fail
        console.log(res);
      },
      complete: function (res) {
        // complete
      }
    })
  }, hexsend: function (e) {
    console.log("checking ", e.detail.value)
    var selected //= e.target.dataset.checks ? false : true;
    if (e.detail.value.length == 0){
      selected=false
    }else{
      selected=true
    }
    this.setData({
      hexSend: selected,
    })
    console.log("hexsend ", this.data.hexSend)
  }, hexrec: function (e) {
    console.log("checking ")
    var selected //= e.target.dataset.checks ? false : true;
    if (e.detail.value.length == 0) {
      selected = false
    } else {
      selected = true
    }
    this.setData({
      hexRec: selected,
    })
    console.log("hexRec = ", this.data.hexRec)
  }, godisconnect(){
    if (this.data.connected){
      wx.closeBLEConnection({
        deviceId: this.data.deviceId
      })
      this.setData({
        connected: false,
        reconnect:"重新连接",
        connectState: "已断开",
      })
      wx.setNavigationBarTitle({
        title: "已断开 " + this.data.device.name
      })
      this.showModalTips(this.data.device.name+"已断开连接...")
    }else{
      wx.setNavigationBarTitle({
        title: "正在连接 " + this.data.device.name
      })
      this.setData({
        connectState: "正在连接",
        reconnect: "连接中...",
      })
      wx.createBLEConnection({
        deviceId: this.data.deviceId,
        success: (res) => {
          this.setData({
            connected: true,
            connectState: "读取服务",
            reconnect: "断开连接",
            recdata: "",
            rxCount: 0,
            txCount: 0,
          })
          wx.setNavigationBarTitle({
            title: "已连接 " + this.data.device.name
          })
          this.getBLEDeviceServices(this.data.deviceId)
        }
      })

    }
  }, settime(){
    console.log("Click Time set");
    this.autoC = false
    this.inputinv = "" + this.data.autoSendInv
    if (this.data.autosendEn){ //正在自动发送，停止它
      this.data.autosendEn = false
      clearTimeout(autoTimer);
      this.setData({
        autosendText: "自动发送"
      })
    }
    this.setData({
      showModal: true
    });
  }, timeinputChange:function(e){
    this.autoC = true
    this.inputinv = e.detail.value;
    console.log("minputC", this.inputinv)
  },
   hideModal: function () {
    this.setData({
      showModal: false
    });
  },
  onCancel: function () {
    this.hideModal();
  },
  onConfirm: function () {
    this.hideModal();
    if (this.autoC){
      //this.data.autoSendInv = new Number(this.inputinv)
      this.setData({
        autoSendInv: parseInt(this.inputinv)
      })
      console.log("time change")
    }
    console.log("minputOK", this.inputinv, this.data.autoSendInv)
  },showModalTips: function (str) {
    var that = this
    this.setData({
      showTips:str
    })
    // 显示遮罩层
    var animation = wx.createAnimation({
      duration: 200,
      timingFunction: "linear",
      delay: 0
    })
    this.animation = animation
    animation.translateY(300).step()
    this.setData({
      animationData: animation.export(),
      showModalStatus: true
    })
    setTimeout(function () {
      animation.translateY(0).step()
      this.setData({
        animationData: animation.export()
      })
    }.bind(this), 200)
    setTimeout(function () {
      that.hideModalTips();
    }, 2000)
  },
  hideModalTips: function () {
    // 隐藏遮罩层
    var animation = wx.createAnimation({
      duration: 200,
      timingFunction: "linear",
      delay: 0
    })
    this.animation = animation
    animation.translateY(300).step()
    this.setData({
      animationData: animation.export(),
    })
    setTimeout(function () {
      animation.translateY(0).step()
      this.setData({
        animationData: animation.export(),
        showModalStatus: false
      })
    }.bind(this), 200)
  },




})
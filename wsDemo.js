
<script>

export default {
	data() {
		return {
			wsUrl: null,
			websock: null, // ws实例
			heartCheck: null,
			lockReconnect: false, // 避免重复连接ws
			websocketFlag: false,
			tt: null
		}
	},
	created() {
		this.wsUrl = this.$root.warningWs;

		this.initHeartCheck(this.wsUrl);
	},
	destroyed() {
		this.websock.close(); // 页面关闭，websocket
	},
	methods: {
		
		// 初始化心跳监测
		initHeartCheck() {
			let that = this;
			var heartCheck = {
				timeout: 600000,
				timeoutObj: null,
				serverTimeoutObj: null,
				start: function() {
					console.log('start');
					var self = this;
					this.timeoutObj && clearTimeout(this.timeoutObj);
					this.serverTimeoutObj && clearTimeout(this.serverTimeoutObj);
					this.timeoutObj = setTimeout(function() {
						// 这里发送一个心跳，后端收到后，返回一个心跳消息
						console.log('ping');
						that.websock.send('ping');
						
						self.serverTimeoutObj = setTimeout(function() {
							console.log('onclose');
							// console.log(that.websock);
							that.websock.onclose();
						}, self.timeout)
						
					}, this.timeout);
				}
			}
			that.heartCheck = heartCheck;
			heartCheck = null;
			that.initWebsock();
		},
		// 初始化ws
		initWebsock() {
			this.websock = null;
			this.websock = new WebSocket(this.wsUrl);
			this.websock.onopen = this.websocketopen;
			this.websock.onmessage = this.websocketonmessage;
			this.websock.onclose = this.websocketclose;
			this.websock.onerror = this.websocketerror;
		},
		websocketopen() {
			this.heartCheck.start();
			console.log('ws连接成功');
		},
		websocketonmessage(e) {
			this.heartCheck.start();
			if(e.data == 'pong') {
				console.log('接收数据：' + e.data)
			} else {
				let data = JSON.parse(e.data);
				data.target = JSON.parse(data.target);
				data.warnTime = util.timestampToTime(data.warnTime, 'yyyy-MM-dd hh:mm:ss');
				data.score = parseFloat(data.score).toFixed(2);
				console.log('接收数据：')
				console.log(data)

				this.addPoint(data, this.curTab, 'unshift');

				if (data.type == 'face') {
					this.personList.unshift(data);
					// 删除超过50条的部分
					if (this.personList.length > 50) {
						this.personList = this.personList.slice(0, 50);
						for (let i = 50; i < personPtObj.length; i++) {
							personPtObj[i].remove();
						}
					}
				} else {
					this.carList.unshift(data);
					// 删除超过50条的部分
					if (this.carList.length > 50) {
						this.carList = this.carList.slice(0, 50);
						for (let i = 50; i < carPtObj.length; i++) {
							carPtObj[i].remove();
						}
					}
				}
			}
		},
		websocketclose() {
			// 关闭
			console.log('ws关闭')
			
			if(this.websocketFlag == false) {
				console.log('关闭重连');
				this.reconnect();
			} else {
				this.heartCheck.timeoutObj && clearTimeout(this.heartCheck.timeoutObj);
				this.heartCheck.serverTimeoutObj && clearTimeout(this.heartCheck.serverTimeoutObj);
				console.log('退出不需要重连');
			}
		},
		websocketerror() {
			console.log('异常，开始重连');
			this.reconnect();
		},
		reconnect() {
			console.log('reconnect 开始重连');
			if(this.lockReconnect) {
				return;
			}
			this.lockReconnect = true;
			// 没连接上会一直重连，设置延迟避免请求过多
			this.tt && clearTimeout(this.tt);
			this.tt = setTimeout(() => {
				this.initWebsock();
				this.lockReconnect = false;
			}, 10000);
		}
	},
}
</script>

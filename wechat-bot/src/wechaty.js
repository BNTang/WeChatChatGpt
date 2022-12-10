import { WechatyBuilder, ScanStatus, log } from "wechaty";
import qrTerminal from "qrcode-terminal";
import { getChatGPTReply } from "./chatgpt.js";

// 扫码
function onScan(qrcode, status) {
  if (status === ScanStatus.Waiting || status === ScanStatus.Timeout) {
    // 在控制台显示二维码
    qrTerminal.generate(qrcode, { small: true });
    const qrcodeImageUrl = [
      "https://api.qrserver.com/v1/create-qr-code/?data=",
      encodeURIComponent(qrcode),
    ].join("");
    console.log("onScan:", qrcodeImageUrl, ScanStatus[status], status);
  } else {
    log.info("onScan: %s(%s)", ScanStatus[status], status);
  }
}

// 登录
function onLogin(user) {
  console.log(`${user} has logged in`);
  const date = new Date();
  console.log(`Current time:${date}`);
  console.log(`Automatic robot chat mode has been activated`);
}

// 登出
function onLogout(user) {
  console.log(`${user} has logged out`);
}

// 收到好友请求
async function onFriendShip(friendship) {
  const frienddShipRe = /chatgpt|chat/;
  if (friendship.type() === 2) {
    if (frienddShipRe.test(friendship.hello())) {
      await friendship.accept();
    }
  }
}

// 收到消息
async function onMessage(msg) {
  // 发消息人
  const contact = msg.talker();
  // 消息内容
  const content = msg.text();
  // 是否是群消息
  const isGroupMessage = msg.room() != null;

  // 发消息人昵称
  const alias = (await contact.alias()) || (await contact.name());

  if (sendMessageConditions(isGroupMessage, content, msg)) {
    console.log("🚀🚀🚀 / content：", content);
    const reply = await getChatGPTReply(content);
    console.log("🚀🚀🚀 / reply：", reply);

    try {
      if (isGroupMessage) {
        // 如果是群消息，那么返回的就是群消息
        sendGroupMessage(msg.room(), reply);
        return;
      }
      // 单人私聊消息
      sendSingleMessage();
    } catch (e) {
      console.error(e);
    }
  }
}

const sendGroupMessage = async function (room, message) {
  await room.say(message);
}

const sendSingleMessage = async function (contact, message) {
  await contact.say(message);
}

const sendMessageConditions = function (isGroupMessage, content, msg) {
  return isGroupMessage
      && (msg.room().payload.topic === "脱单进度群1&7"
      || msg.room().payload.topic === "测试ai机器人"
      )
      && (
          content.search("@ㅤ　　　　　　　　") !== -1
          || content.search("@机器人") !== -1
          || content.search("@") !== -1
      )
      // 消息类型是否为文本
      && msg.type() === bot.Message.Type.Text;
}

// 初始化机器人
const bot = WechatyBuilder.build({
  name: "WechatEveryDay",
  puppet: "wechaty-puppet-wechat", // 如果有token，记得更换对应的puppet
  puppetOptions: {
    uos: true,
  },
});

// 扫码
bot.on("scan", onScan);
// 登录
bot.on("login", onLogin);
// 登出
bot.on("logout", onLogout);
// 收到消息
bot.on("message", onMessage);
// 添加好友
bot.on("friendship", onFriendShip);

// 启动微信机器人
bot
  .start()
  .then(() => console.log("Start to log in wechat..."))
  .catch((e) => console.error(e));

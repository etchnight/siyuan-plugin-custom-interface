import { Plugin, Setting } from "siyuan";
import { backLinkInDoc } from "./component/backlinkInDoc";
import { switchEle } from "./component/setting";
import { embedInOutline } from "./component/embedInOutline";
const STORAGE_NAME = "menuConfig";

export default class PLuginCustomInterface extends Plugin {
  private blinkInDoc: backLinkInDoc;
  private embedInOutl = new embedInOutline();

  private featureList: {
    name: string;
    switchFunc: (close?: boolean) => void;
    title: string;
  }[] = [
    {
      name: "embedInOutline",
      switchFunc: this.switchEmbedInOutl.bind(this),
      title: "是否将反向链接以嵌入块形式插入文档（刷新生效）",
    },
    {
      name: "backLinkInDoc",
      switchFunc: this.switchBlinkInDoc.bind(this),
      title: "是否将嵌入块放入大纲",
    },
  ];
  async onload() {
    this.data[STORAGE_NAME] = {};
    for (let item of this.featureList) {
      this.data[STORAGE_NAME][item.name] = false;
    }
  }

  async onLayoutReady() {
    await this.loadData(STORAGE_NAME);
    this.buildSetting();
    for (let item of this.featureList) {
      item.switchFunc();
    }
  }
  onunload() {
    for (let item of this.featureList) {
      item.switchFunc(true);
    }
  }

  private buildSetting = () => {
    let eles: {
      [key: string]: HTMLInputElement;
    } = {};
    for (let item of this.featureList) {
      eles[item.name] = switchEle();
    }
    this.setting = new Setting({
      confirmCallback: async () => {
        let config = {};
        for (let item of this.featureList) {
          config[item.name] = eles[item.name].checked;
          item.switchFunc();
        }
        this.saveData(STORAGE_NAME, config);
      },
    });
    for (let item of this.featureList) {
      this.setting.addItem({
        title: item.title,
        createActionElement: () => {
          eles[item.name].checked = this.data[STORAGE_NAME][item.name];
          return eles[item.name];
        },
      });
    }
  };
  /**
   *
   * @param close 不管设置如何，强制关闭，一般用于挂件卸载时
   */
  private switchBlinkInDoc(close?: boolean) {
    if (this.data[STORAGE_NAME].embedInOutline && !close) {
      this.blinkInDoc = new backLinkInDoc();
      this.eventBus.on("loaded-protyle-static", this.blinkInDoc.backLinkInDoc);
      this.eventBus.on("loaded-protyle-dynamic", this.blinkInDoc.backLinkInDoc);
      this.eventBus.on("click-blockicon", this.blinkInDoc.blockIconEvent);
    } else if (this.blinkInDoc) {
      this.eventBus.off("loaded-protyle-static", this.blinkInDoc.backLinkInDoc);
      this.eventBus.off(
        "loaded-protyle-dynamic",
        this.blinkInDoc.backLinkInDoc
      );
      this.eventBus.off("click-blockicon", this.blinkInDoc.blockIconEvent);
    }
  }
  private switchEmbedInOutl(close?: boolean) {
    if (this.data[STORAGE_NAME].backLinkInDoc && !close) {
      this.embedInOutl.init();
    } else {
      this.embedInOutl.disConnect();
    }
  }
}

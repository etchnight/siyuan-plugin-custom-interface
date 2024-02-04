import { Plugin, Setting } from "siyuan";
import { backLinkInDoc } from "./component/backlinkInDoc";
import { switchEle } from "./component/setting";
const STORAGE_NAME = "menuConfig";

export default class PLuginCustomInterface extends Plugin {
  private blinkInDoc: backLinkInDoc;
  async onload() {
    this.data[STORAGE_NAME] = { blinkInDoc: false };
    this.buildSetting();
  }

  async onLayoutReady() {
    await this.loadData(STORAGE_NAME);
    this.switchBlinkInDoc();
  }
  onunload() {
    this.switchBlinkInDoc(true);
  }

  private buildSetting = () => {
    const backLinkInDocEle = switchEle();
    this.setting = new Setting({
      confirmCallback: async () => {
        this.saveData(STORAGE_NAME, {
          blinkInDoc: backLinkInDocEle.checked,
        });
        this.switchBlinkInDoc();
      },
    });
    this.setting.addItem({
      title: "是否将反向链接以嵌入块形式插入文档（刷新生效）",
      createActionElement: () => {
        backLinkInDocEle.checked = this.data[STORAGE_NAME].blinkInDoc;
        return backLinkInDocEle;
      },
    });
  };
  private switchBlinkInDoc = (close?: boolean) => {
    if (this.data[STORAGE_NAME].blinkInDoc && !close) {
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
  };
}

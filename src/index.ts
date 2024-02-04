import { Plugin } from "siyuan";
import { backLinkInDoc } from "./component/backlinkInDoc";

export default class PLuginCustomInterface extends Plugin {
  private blinkInDoc = new backLinkInDoc();

  async onload() {}

  onLayoutReady() {
    this.eventBus.on("loaded-protyle-static", this.blinkInDoc.backLinkInDoc);
    this.eventBus.on("loaded-protyle-dynamic", this.blinkInDoc.backLinkInDoc);
    this.eventBus.on("click-blockicon", this.blinkInDoc.blockIconEvent);
  }

  onunload() {
    this.eventBus.off("loaded-protyle-static", this.blinkInDoc.backLinkInDoc);
    this.eventBus.off("loaded-protyle-dynamic", this.blinkInDoc.backLinkInDoc);
    this.eventBus.off("click-blockicon", this.blinkInDoc.blockIconEvent);
  }
}

import { Plugin, openTab } from "siyuan";
import { getDoc, getRefIDs } from "../../siyuanPlugin-common/siyuan-api";
import { Block, BlockId } from "../../siyuanPlugin-common/types/siyuan-api";
import { renderBreadcrumb } from "./breadcrumb";
export default class PluginBackLinkInDoc extends Plugin {
  private addEleThis = this.addEle.bind(this);
  async onload() {}

  onLayoutReady() {
    this.eventBus.on("loaded-protyle", this.addEleThis);
    this.eventBus.on("loaded-protyle-dynamic", this.addEleThis);
  }

  onunload() {
    this.eventBus.off("loaded-protyle", this.addEleThis);
    this.eventBus.off("loaded-protyle-dynamic", this.addEleThis);
  }
  private async addEle({ detail }: any) {
    //this.eventBus.off("loaded-protyle", this.addEleThis);
    //this.eventBus.off("loaded-protyle-dynamic", this.addEleThis);
    //console.log(detail);
    const parentEle = (detail.wysiwyg?.element ||
      detail.protyle?.wysiwyg.element) as HTMLElement;
    const blockEleList = parentEle.querySelectorAll("[data-node-id]");
    const blockElesHasBack: Element[] = [];
    for (let blockEle of blockEleList) {
      let ele = blockEle.querySelector(
        ".protyle-attr--refcount.popover__block"
      );
      if (ele) {
        blockElesHasBack.push(blockEle);
      }
    }
    blockElesHasBack.forEach(async (blockEle) => {
      //*查询反向引用
      const blockId = blockEle.getAttribute("data-node-id");
      if (blockEle.parentElement.querySelector(`[target-id='${blockId}']`)) {
        return;
      }

      //*获取反向引用块
      let superBlock = await this.nodeSuperBlock(blockId);
      PluginBackLinkInDoc.insertAfter(superBlock, blockEle);
    });
    //console.log(detail.wysiwyg.element);
    //this.eventBus.on("loaded-protyle", this.addEleThis);
    //this.eventBus.on("loaded-protyle-dynamic", this.addEleThis);
  }
  /**
   * 在targetElement之后插入 新节点newElement
   * @param newElement
   * @param targetElement
   */
  static insertAfter(newElement: Element, targetElement: Element) {
    let parent = targetElement.parentNode;
    if (!parent) {
      return;
    }
    if (parent.lastChild == targetElement) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, targetElement.nextSibling);
    }
  }
  private async nodeSuperBlock(id: BlockId) {
    if (!id) {
      return;
    }
    let superBlock = document.createElement("div");

    //*样式
    superBlock.style.border = "1px dashed #C0C0C0";
    superBlock.style.borderRadius = "4px";
    superBlock.style.margin = "5px";
    superBlock.style.padding = "5px";

    superBlock.setAttribute("target-id", id);

    //*阻止动作
    superBlock.onmouseover = (event) => {
      event.stopPropagation();
    };
    superBlock.onclick = (event) => {
      event.stopPropagation();
    };
    //嵌入块
    /*ele.setAttribute("data-type", "NodeBlockQueryEmbed");
    ele.className = "render-node";
    ele.setAttribute("custom-heading-mode", "0");
    ele.setAttribute("data-render", "false");*/

    //*outerHtml用
    let parent = document.createElement("div");
    parent.appendChild(superBlock);

    //*异步获取反向引用块
    const data = await getRefIDs(id);
    const handle = async (id: BlockId) => {
      const refBlock = await this.nodeDivBlock(id);
      return refBlock;
    };
    const queue = data.refIDs.map((id) => {
      return handle(id);
    });
    const eleList = await Promise.all(queue);
    eleList.forEach((item) => {
      if (item) {
        superBlock.append(item);
      }
    });

    //*进入可视区域后更新
    this.intersectionObserver.observe(superBlock);
    return superBlock;
  }
  private async nodeDivBlock(id: BlockId) {
    const [ref, breadcrumb] = await Promise.all([
      getDoc(id),
      renderBreadcrumb(id),
    ]);
    if (!ref.content) {
      return;
    }
    let divEle = document.createElement("div");
    divEle.innerHTML = ref.content;
    divEle.setAttribute("contenteditable", "false"); //*禁止编辑
    divEle.onclick = (event) => {
      event.stopPropagation();
      openTab({
        app: this.app,
        doc: {
          id: id, //divEle.getAttribute("data-node-id"), // 块 id
          action: ["cb-get-all", "cb-get-hl"], // cb-get-all：获取所有内容；cb-get-focus：打开后光标定位在 id 所在的块；cb-get-hl: 打开后 id 块高亮
        },
        //keepCursor: false,
      });
    };
    divEle.onmouseover = (event) => {
      event.stopPropagation();
    };
    divEle.style.cursor = "pointer";
    //*breadcrumb
    divEle.insertBefore(breadcrumb, divEle.firstElementChild);

    return divEle;
  }
  /**
   * 更新superBlock
   */
  private intersectionObserver = new IntersectionObserver((entries) => {
    // 如果 intersectionRatio 为 0，则目标在视野外，
    if (entries[0].intersectionRatio <= 0) return;
    entries.forEach(async (item) => {
      let superBlock = item.target;
      const id = superBlock.getAttribute("target-id");
      const newEle = await this.nodeSuperBlock(id);
      if (newEle) {
        superBlock.parentNode.insertBefore(newEle, superBlock);
      }
      superBlock.remove();
    });
  });
}

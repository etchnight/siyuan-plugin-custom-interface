//@ts-ignore 未使用但是不能删除，否则将提示window.Lute错误
import { Window } from "../../../siyuanPlugin-common/siyuan-api";

const customEleAttrName = "PluginBackLinkInDoc-target-id";
export class backLinkInDoc {
  private isAdding = false; //是否在进行添加
  private isCustomBlockMenu: boolean; //menu是否由虚拟块触发，在eventBus和MutationObserver之间传递状态

  public backLinkInDoc = async ({ detail }: any) => {
    //this.eventBus.off("loaded-protyle", this.addEleThis);
    //this.eventBus.off("loaded-protyle-dynamic", this.addEleThis);
    //console.log(detail);
    if (this.isAdding) {
      return;
    } else {
      this.isAdding = true;
    }

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
    blockElesHasBack.forEach((blockEle) => {
      const blockId = blockEle.getAttribute("data-node-id");
      let superBlock = this.NodeBlockQueryEmbed(blockId);
      this.insertAfter(superBlock, blockEle);
      let reloadElement = superBlock.querySelector(
        "span.protyle-action__reload"
      ) as HTMLSpanElement;
      if (reloadElement) {
        reloadElement.click();
      }
    });
    /*blockElesHasBack.forEach(async (blockEle) => {
          //*查询反向引用
          const blockId = blockEle.getAttribute("data-node-id");
          if (blockEle.parentElement.querySelector(`[target-id='${blockId}']`)) {
            return;
          }
          let superBlock = await this.nodeSuperBlock(blockId);
          PluginBackLinkInDoc.insertAfter(superBlock, blockEle);
        });*/
    this.isAdding = false;
    return;
  };
  /**
   * 构建嵌入块
   */
  private NodeBlockQueryEmbed = (blockId: string) => {
    let ele = document.createElement("div");
    ele.setAttribute("data-node-id", window.Lute.NewNodeID());
    ele.setAttribute("data-type", "NodeBlockQueryEmbed");
    ele.className = "render-node";
    ele.setAttribute("data-render", "false");
    ele.setAttribute(
      "data-content",
      `SELECT blocks.* FROM blocks WHERE blocks.id IN
          (SELECT block_id FROM refs WHERE def_block_id='${blockId}') `
    );

    ele.innerHTML = `<div class="protyle-icons">
        <span aria-label="刷新" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__reload protyle-icon--first"><svg class=""><use xlink:href="#iconRefresh"></use></svg></span>
        <span aria-label="更新 SQL" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__edit"><svg><use xlink:href="#iconEdit"></use></svg></span>
        <span aria-label="更多" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__menu protyle-icon--last"><svg><use xlink:href="#iconMore"></use></svg></span>
    </div>`;
    /*<div data-content="select * from blocks where id='20210916222543-9sxlmu7'" data-node-id="20230916170359-3gnjhvp"
        data-node-index="1" data-type="NodeBlockQueryEmbed" class="render-node" updated="20230916170359" data-render="true"
        style="">*/
    this.domChangeobserver.observe(ele, {
      childList: true,
      attributes: false,
      subtree: true,
    });
    ele.setAttribute(customEleAttrName, blockId); //区分是否为虚拟块
    return ele;
  };
  /**
   * 在targetElement之后插入 新节点newElement
   * @param newElement
   * @param targetElement
   */
  private insertAfter = (newElement: Element, targetElement: Element) => {
    let parent = targetElement.parentNode;
    if (!parent) {
      return;
    }
    if (parent.lastChild == targetElement) {
      parent.appendChild(newElement);
    } else {
      parent.insertBefore(newElement, targetElement.nextSibling);
    }
  };

  /**
   * 与 NodeBlockQueryEmbed 共同工作
   */
  private domChangeobserver = new MutationObserver((mutationList) => {
    mutationList.forEach((mutation) => {
      let target = mutation.target as HTMLElement;
      //console.log("已监听", target);
      //*样式
      if (target.getAttribute("data-type") === "NodeBlockQueryEmbed") {
        target.style.border = "1px dashed #C0C0C0";
        target.style.borderRadius = "4px";
      }
      //*禁用编辑//protyle-action__edit
      let spanEdit = target.querySelector(
        `span[class*=protyle-action__edit]`
      ) as HTMLSpanElement;
      if (spanEdit) {
        spanEdit.remove();
      }
    });
  });

  /**
   * 禁用块菜单中的大多数项
   */
  public blockIconEvent = ({ detail }: any) => {
    this.isCustomBlockMenu = false;
    for (let item of detail.blockElements) {
      if (item.getAttribute(customEleAttrName)) {
        this.isCustomBlockMenu = true;
      }
    }
    if (this.isCustomBlockMenu) {
      let menu = document.querySelector("#commonMenu");
      this.menuObserver.observe(menu, {
        childList: true,
        attributes: false,
        subtree: true,
      });
    } else {
      this.menuObserver.disconnect();
    }
  };
  /**
   * 与blockIconEvent共同工作
   */
  private menuObserver = new MutationObserver((mutationList) => {
    if (!this.isCustomBlockMenu) {
      return;
    }
    for (let mutation of mutationList) {
      let menu = mutation.target as HTMLElement;
      if (menu.textContent.search(window.siyuan.languages.embedBlock) == -1) {
        this.isCustomBlockMenu = false;
        return;
      }
      let buttonList = menu.querySelectorAll("button[class*='b3-menu__item']");
      for (let item of buttonList) {
        let menuLabel = item.querySelector(".b3-menu__label");
        if (
          menuLabel &&
          menuLabel.textContent === window.siyuan.languages.embedBlock
        ) {
          let subMenu = item.querySelectorAll("button[class*='b3-menu__item']");
          for (let subItem of subMenu) {
            let subMenuLabel = subItem.querySelector(".b3-menu__label");
            if (
              subMenuLabel &&
              subMenuLabel.textContent ===
                `${window.siyuan.languages.update} SQL`
            ) {
              subItem.classList.add("b3-menu__item--readonly");
            }
          }
        } else {
          item.classList.add("b3-menu__item--readonly");
        }
      }
    }
    this.isCustomBlockMenu = false;
  });
}

/**
 * 自构建的仿嵌入块
 * *@deprecated 使用真正的嵌入块，不再使用自构建的仿嵌入块
 * *@param id
 * *@returns
 */
/*
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

    superBlock.setAttribute(customEleAttrName, id);

    //*阻止动作
    superBlock.onmouseover = (event) => {
      event.stopPropagation();
    };
    superBlock.onclick = (event) => {
      event.stopPropagation();
    };


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
  */

/**
 * *@deprecated 不再使用自构建的仿嵌入块，因此不再使用
 * *@param id
 * *@returns
 */
/*private async nodeDivBlock(id: BlockId) {
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
  }*/
/**
 * *@deprecated 不再使用自构建的仿嵌入块，因此不再使用
 * superBlock进入可视区域时，更新superBlock
 */
/*private intersectionObserver = new IntersectionObserver((entries) => {
    // 如果 intersectionRatio 为 0，则目标在视野外，
    if (entries[0].intersectionRatio <= 0) return;
    entries.forEach(async (item) => {
      let superBlock = item.target;
      const id = superBlock.getAttribute(customEleAttrName);
      const newEle = await this.nodeSuperBlock(id);
      if (newEle) {
        superBlock.parentNode.insertBefore(newEle, superBlock);
      }
      superBlock.remove();
    });
  });
  */

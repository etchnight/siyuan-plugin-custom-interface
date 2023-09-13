/*import {
  hasClosestByAttribute,
  hasTopClosestByClassName,
} from "../util/hasClosest";
import { fetchPost } from "../../util/fetch";
import { processRender } from "../util/processCode";
import { highlightRender } from "./highlightRender";
import { Constants } from "../../constants";
import { genBreadcrumb } from "../wysiwyg/renderBacklink";
import { avRender } from "./av/render";*/
import { fetchPost } from "siyuan";
import { Window_siyuan } from "../../siyuanPlugin-common/types/siyuan-api";
declare global {
  interface Window {
    siyuan: Window_siyuan;
  }
}
export const blockRender = (protyle: any, element: Element, top?: number) => {
  let blockElements: Element[] = [];
  if (element.getAttribute("data-type") === "NodeBlockQueryEmbed") {
    // 编辑器内代码块编辑渲染
    blockElements = [element];
  } else {
    blockElements = Array.from(
      element.querySelectorAll('[data-type="NodeBlockQueryEmbed"]')
    );
  }
  if (blockElements.length === 0) {
    return;
  }
  blockElements.forEach((item: HTMLElement) => {
    if (item.getAttribute("data-render") === "true") {
      return;
    }
    // 需置于请求返回前，否则快速滚动会导致重复加载 https://ld246.com/article/1666857862494?r=88250
    item.setAttribute("data-render", "true");
    item.style.height = item.clientHeight - 8 + "px"; // 减少抖动 https://ld246.com/article/1668669380171
    item.innerHTML = `<div class="protyle-icons${
      hasClosestByAttribute(
        item.parentElement,
        "data-type",
        "NodeBlockQueryEmbed"
      )
        ? " fn__none"
        : ""
    }">
    <span aria-label="${
      window.siyuan.languages.refresh
    }" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__reload protyle-icon--first"><svg class="fn__rotate"><use xlink:href="#iconRefresh"></use></svg></span>
    <span aria-label="${
      window.siyuan.languages.update
    } SQL" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__edit"><svg><use xlink:href="#iconEdit"></use></svg></span>
    <span aria-label="${
      window.siyuan.languages.more
    }" class="b3-tooltips__nw b3-tooltips protyle-icon protyle-action__menu protyle-icon--last"><svg><use xlink:href="#iconMore"></use></svg></span>
</div>${item.lastElementChild.outerHTML}`;
    const content = Lute.UnEscapeHTMLStr(item.getAttribute("data-content"));
    let breadcrumb: boolean | string = item.getAttribute("breadcrumb");
    if (breadcrumb) {
      breadcrumb = breadcrumb === "true";
    } else {
      //@ts-ignore
      breadcrumb = window.siyuan.config.editor.embedBlockBreadcrumb;
    }
    // https://github.com/siyuan-note/siyuan/issues/7575
    const sbElement = hasTopClosestByClassName(item, "sb");
    if (sbElement) {
      breadcrumb = false;
    }
    fetchPost(
      "/api/search/searchEmbedBlock",
      {
        embedBlockID: item.getAttribute("data-node-id"),
        stmt: content,
        headingMode: item.getAttribute("custom-heading-mode") === "1" ? 1 : 0,
        excludeIDs: [item.getAttribute("data-node-id"), protyle.block.rootID],
        breadcrumb,
      },
      (response) => {
        const rotateElement = item.querySelector(".fn__rotate");
        if (rotateElement) {
          rotateElement.classList.remove("fn__rotate");
        }
        let html = "";
        const ZWSP = "\u200b";
        response.data.blocks.forEach(
          (blocksItem: { block: Block; blockPaths: [] }) => {
            let breadcrumbHTML = "";
            if (blocksItem.blockPaths.length !== 0) {
              breadcrumbHTML = genBreadcrumb(blocksItem.blockPaths, true);
            }
            html += `<div class="protyle-wysiwyg__embed" data-id="${blocksItem.block.id}">${breadcrumbHTML}${blocksItem.block.content}</div>`;
          }
        );
        if (response.data.blocks.length > 0) {
          item.lastElementChild.insertAdjacentHTML(
            "beforebegin",
            html +
              // 辅助上下移动时进行选中
              `<div style="position: absolute;">${ZWSP}</div>`
          );
        } else {
          item.lastElementChild.insertAdjacentHTML(
            "beforebegin",
            `<div class="ft__smaller ft__secondary b3-form__space--small" contenteditable="false">${window.siyuan.languages.refExpired}</div>
<div style="position: absolute;">${ZWSP}</div>`
          );
        }

        processRender(item);
        highlightRender(item);
        avRender(item);
        if (top) {
          // 前进后退定位 https://ld246.com/article/1667652729995
          protyle.contentElement.scrollTop = top;
        }
        let maxDeep = 0;
        let deepEmbedElement: false | HTMLElement = item;
        while (maxDeep < 4 && deepEmbedElement) {
          deepEmbedElement = hasClosestByAttribute(
            deepEmbedElement.parentElement,
            "data-type",
            "NodeBlockQueryEmbed"
          );
          maxDeep++;
        }
        if (maxDeep < 4) {
          item
            .querySelectorAll('[data-type="NodeBlockQueryEmbed"]')
            .forEach((embedElement) => {
              blockRender(protyle, embedElement);
            });
        }
        item.style.height = "";
      }
    );
  });
};

export const hasClosestByAttribute = (
  element: Node,
  attr: string,
  value: string | null,
  top = false
) => {
  if (!element) {
    return false;
  }
  if (element.nodeType === 3) {
    element = element.parentElement;
  }
  let e = element as HTMLElement;
  let isClosest = false;
  while (
    e &&
    !isClosest &&
    (top ? e.tagName !== "BODY" : !e.classList.contains("protyle-wysiwyg"))
  ) {
    if (
      typeof value === "string" &&
      e.getAttribute(attr)?.split(" ").includes(value)
    ) {
      isClosest = true;
    } else if (typeof value !== "string" && e.hasAttribute(attr)) {
      isClosest = true;
    } else {
      e = e.parentElement;
    }
  }
  return isClosest && e;
};

export const hasTopClosestByClassName = (
  element: Node,
  className: string,
  top = false
) => {
  let closest = hasClosestByClassName(element, className, top);
  let parentClosest: boolean | HTMLElement = false;
  let findTop = false;
  while (
    closest &&
    (top
      ? closest.tagName !== "BODY"
      : !closest.classList.contains("protyle-wysiwyg")) &&
    !findTop
  ) {
    parentClosest = hasClosestByClassName(
      closest.parentElement,
      className,
      top
    );
    if (parentClosest) {
      closest = parentClosest;
    } else {
      findTop = true;
    }
  }
  return closest || false;
};

export const hasClosestByClassName = (
  element: Node,
  className: string,
  top = false
) => {
  if (!element) {
    return false;
  }
  if (element.nodeType === 3) {
    element = element.parentElement;
  }
  let e = element as HTMLElement;
  let isClosest = false;
  while (
    e &&
    !isClosest &&
    (top ? e.tagName !== "BODY" : !e.classList.contains("protyle-wysiwyg"))
  ) {
    if (e.classList?.contains(className)) {
      isClosest = true;
    } else {
      e = e.parentElement;
    }
  }
  return isClosest && e;
};

export const genBreadcrumb = (
  blockPaths: IBreadcrumb[],
  renderFirst = false
) => {
  let html = "";
  blockPaths.forEach((item, index) => {
    if (index === 0 && !renderFirst) {
      return;
    }
    html += `<span class="protyle-breadcrumb__item${
      index === blockPaths.length - 1 ? " protyle-breadcrumb__item--active" : ""
    }" data-id="${item.id}">
  <svg class="popover__block" data-id="${
    item.id
  }"><use xlink:href="#${getIconByType(item.type, item.subType)}"></use></svg>
  <span class="protyle-breadcrumb__text" title="${item.name}">${
      item.name
    }</span>
</span>`;
    if (index !== blockPaths.length - 1) {
      html +=
        '<svg class="protyle-breadcrumb__arrow"><use xlink:href="#iconRight"></use></svg>';
    }
  });
  return `<div contenteditable="false" class="protyle-breadcrumb__bar protyle-breadcrumb__bar--nowrap">${html}</div>`;
};

interface IBreadcrumb {
  id: string;
  name: string;
  type: string;
  subType: string;
  children: [];
}

export const avRender = (element: Element, cb?: () => void) => {
  let avElements: Element[] = [];
  if (element.getAttribute("data-type") === "NodeAttributeView") {
    // 编辑器内代码块编辑渲染
    avElements = [element];
  } else {
    avElements = Array.from(
      element.querySelectorAll('[data-type="NodeAttributeView"]')
    );
  }
  if (avElements.length === 0) {
    return;
  }
  if (avElements.length > 0) {
    avElements.forEach((e: HTMLElement) => {
      if (e.getAttribute("data-render") === "true") {
        return;
      }
      const left = e.querySelector(".av__scroll")?.scrollLeft || 0;
      fetchPost(
        "/api/av/renderAttributeView",
        {
          id: e.getAttribute("data-av-id"),
          nodeID: e.getAttribute("data-node-id"),
        },
        (response) => {
          const data = response.data.view;
          // header
          let tableHTML =
            '<div class="av__row av__row--header"><div class="av__firstcol"><svg style="height: 32px"><use xlink:href="#iconUncheck"></use></svg></div>';
          let calcHTML = "";
          data.columns.forEach((column) => {
            if (column.hidden) {
              return;
            }
            tableHTML += `<div class="av__cell" data-col-id="${
              column.id
            }" data-dtype="${column.type}"  
style="width: ${column.width || "200px"};
${column.wrap ? "" : "white-space: nowrap;"}">
  <div draggable="true" class="av__cellheader">
      <svg><use xlink:href="#${
        column.icon || getColIconByType(column.type)
      }"></use></svg>
      <span class="av__celltext">${column.name}</span>
  </div>
  <div class="av__widthdrag"></div>
</div>`;
            calcHTML += `<div class="av__calc${
              calcHTML ? "" : " av__calc--show"
            }${
              column.calc && column.calc.operator !== ""
                ? " av__calc--ashow"
                : ""
            }" data-col-id="${column.id}" data-dtype="${
              column.type
            }" data-operator="${column.calc?.operator || ""}"  
style="width: ${column.width || "200px"}">${
              getCalcValue(column) ||
              '<svg><use xlink:href="#iconDown"></use></svg>' +
                window.siyuan.languages.calc
            }</div>`;
          });
          tableHTML += `<div class="block__icons" style="min-height: auto">
  <div class="block__icon block__icon--show" data-type="av-header-add"><svg><use xlink:href="#iconAdd"></use></svg></div>
  <div class="fn__space"></div>
  <div class="block__icon block__icon--show"  data-type="av-header-more"><svg><use xlink:href="#iconMore"></use></svg></div>
</div>
</div>`;
          // body
          data.rows.forEach((row) => {
            tableHTML += `<div class="av__row" data-id="${row.id}">
<div class="av__gutters ariaLabel" draggable="true" data-position="right" aria-label="${window.siyuan.languages.rowTip}">
  <button><svg><use xlink:href="#iconLine"></use></svg></button>
</div>
<div class="av__firstcol"><svg><use xlink:href="#iconUncheck"></use></svg></div>`;
            row.cells.forEach((cell, index) => {
              if (data.columns[index].hidden) {
                return;
              }
              let text = "";
              if (cell.valueType === "text") {
                text = `<span class="av__celltext">${
                  cell.value?.text.content || ""
                }</span>`;
              } else if (["url", "email", "phone"].includes(cell.valueType)) {
                text = `<span class="av__celltext av__celltext--url" data-type="${
                  cell.valueType
                }">${
                  cell.value ? cell.value[cell.valueType as "url"].content : ""
                }</span>`;
                if (cell.value && cell.value[cell.valueType as "url"].content) {
                  text += `<span data-type="copy" class="b3-tooltips b3-tooltips__n block__icon" aria-label="${window.siyuan.languages.copy}"><svg><use xlink:href="#iconCopy"></use></svg></span>`;
                }
              } else if (cell.valueType === "block") {
                text = `<span class="av__celltext">${
                  cell.value?.block.content || ""
                }</span>`;
                if (cell.value?.block.id) {
                  text += `<span class="b3-chip b3-chip--info b3-chip--small" data-type="block-ref" data-id="${cell.value.block.id}" data-subtype="s">${window.siyuan.languages.openBy}</span>`;
                }
              } else if (cell.valueType === "number") {
                text = `<span class="av__celltext" data-content="${
                  cell.value?.number.content || ""
                }">${cell.value?.number.formattedContent || ""}</span>`;
              } else if (
                cell.valueType === "mSelect" ||
                cell.valueType === "select"
              ) {
                cell.value?.mSelect?.forEach(
                  (item: { content: string; color: string }) => {
                    text += `<span class="b3-chip b3-chip--middle" style="background-color:var(--b3-font-background${item.color});color:var(--b3-font-color${item.color})">${item.content}</span>`;
                  }
                );
                if (!text) {
                  text = '<span class="av__celltext"></span>';
                } else {
                  text = `<span class="av__celltext">${text}</span>`;
                }
              } else if (cell.valueType === "date") {
                text = '<span class="av__celltext av__celltext--date">';
                if (cell.value?.date.isNotEmpty) {
                  text += dayjs(cell.value.date.content).format(
                    "YYYY-MM-DD HH:mm"
                  );
                }
                if (
                  cell.value?.date.hasEndDate &&
                  cell.value?.date.isNotEmpty &&
                  cell.value?.date.isNotEmpty2
                ) {
                  text += `<svg><use xlink:href="#iconForward"></use></svg>${dayjs(
                    cell.value.date.content2
                  ).format("YYYY-MM-DD HH:mm")}`;
                }
                text += "</span>";
              }
              tableHTML += `<div class="av__cell" data-id="${
                cell.id
              }" data-col-id="${data.columns[index].id}"
${
  cell.valueType === "block"
    ? 'data-block-id="' + (cell.value.block.id || "") + '"'
    : ""
}  
style="width: ${data.columns[index].width || "200px"};
${cell.bgColor ? `background-color:${cell.bgColor};` : ""}
${data.columns[index].wrap ? "" : "white-space: nowrap;"}
${cell.valueType !== "number" ? "" : "flex-direction: row-reverse;"}
${cell.color ? `color:${cell.color};` : ""}">${text}</div>`;
            });
            tableHTML += "<div></div></div>";
          });
          let tabHTML = "";
          response.data.views.forEach((item) => {
            tabHTML += `<div data-id="${response.data.viewID}" class="item${
              item.id === response.data.viewID ? " item--focus" : ""
            }">
  <svg class="item__graphic"><use xlink:href="#iconTable"></use></svg>
  <span class="item__text">${item.name}</span>
</div>`;
          });
          const paddingLeft = e.parentElement.style.paddingLeft;
          const paddingRight = e.parentElement.style.paddingRight;
          e.style.width = e.parentElement.clientWidth + "px";
          e.style.alignSelf = "center";
          e.firstElementChild.outerHTML = `<div>
  <div class="av__header" style="padding-left: ${paddingLeft};padding-right: ${paddingRight};">
      <div class="layout-tab-bar fn__flex">
          ${tabHTML}
          <div class="fn__flex-1"></div>
          <span data-type="av-filter" class="block__icon block__icon--show b3-tooltips b3-tooltips__w${
            data.filters.length > 0 ? " block__icon--active" : ""
          }" aria-label="${window.siyuan.languages.filter}">
              <svg><use xlink:href="#iconFilter"></use></svg>
          </span>
          <div class="fn__space"></div>
          <span data-type="av-sort" class="block__icon block__icon--show b3-tooltips b3-tooltips__w${
            data.sorts.length > 0 ? " block__icon--active" : ""
          }" aria-label="${window.siyuan.languages.sort}">
              <svg><use xlink:href="#iconSort"></use></svg>
          </span>
          <div class="fn__space"></div>
          <span data-type="av-more" class="block__icon block__icon--show b3-tooltips b3-tooltips__w" aria-label="${
            window.siyuan.languages.more
          }">
              <svg><use xlink:href="#iconMore"></use></svg>
          </span>
          <div class="fn__space"></div>
      </div>
      <div contenteditable="true" class="av__title" data-title="${
        data.name || ""
      }" data-tip="${window.siyuan.languages.title}">${
            response.data.name || ""
          }</div>
      <div class="av__counter fn__none"></div>
  </div>
  <div class="av__scroll">
      <div style="padding-left: ${paddingLeft};padding-right: ${paddingRight};float: left;">
          ${tableHTML}
          <div class="av__row--add">
              <svg><use xlink:href="#iconAdd"></use></svg>
              ${window.siyuan.languages.addAttr}
          </div>
          <div class="av__row--footer"><div style="width: 24px"></div>${calcHTML}</div>
      </div>
  </div>
</div>`;
          e.setAttribute("data-render", "true");
          e.querySelector(".av__scroll").scrollLeft = left;
          if (cb) {
            cb();
          }
        }
      );
    });
  }
};

export const highlightRender = (
  element: Element,
  cdn = Constants.PROTYLE_CDN
) => {
  let codeElements: NodeListOf<Element>;
  let isPreview = false;
  if (element.classList.contains("code-block")) {
    // 编辑器内代码块编辑渲染
    codeElements = element.querySelectorAll("[spellcheck]");
  } else {
    if (element.classList.contains("item__readme")) {
      // bazaar reademe
      codeElements = element.querySelectorAll("pre code");
      codeElements.forEach((item) => {
        item.parentElement.setAttribute("lineNumber", "false");
      });
    } else if (element.classList.contains("b3-typography")) {
      // preview & export html markdown
      codeElements = element.querySelectorAll(".code-block code");
      isPreview = true;
    } else {
      codeElements = element.querySelectorAll(".code-block [spellcheck]");
    }
  }
  if (codeElements.length === 0) {
    return;
  }

  setCodeTheme(cdn);

  addScript(
    `${cdn}/js/highlight.js/highlight.min.js?v=11.7.0`,
    "protyleHljsScript"
  ).then(() => {
    addScript(
      `${cdn}/js/highlight.js/third-languages.js?v=1.0.1`,
      "protyleHljsThirdScript"
    ).then(() => {
      codeElements.forEach((block: HTMLElement) => {
        const iconElements =
          block.parentElement.querySelectorAll(".protyle-icon");
        if (iconElements.length === 2) {
          iconElements[0].setAttribute(
            "aria-label",
            window.siyuan.languages.copy
          );
          iconElements[1].setAttribute(
            "aria-label",
            window.siyuan.languages.more
          );
        }
        if (block.getAttribute("data-render") === "true") {
          return;
        }
        const wbrElement = block.querySelector("wbr");
        let startIndex = 0;
        if (wbrElement) {
          let previousSibling = wbrElement.previousSibling;
          while (previousSibling) {
            startIndex += previousSibling.textContent.length;
            while (
              !previousSibling.previousSibling &&
              previousSibling.parentElement.tagName !== "DIV"
            ) {
              // 高亮 span 中输入
              previousSibling = previousSibling.parentElement;
            }
            previousSibling = previousSibling.previousSibling;
          }
          wbrElement.remove();
        }

        let language;
        if (isPreview) {
          language = block.parentElement.getAttribute("data-language"); // preview
        } else if (block.previousElementSibling) {
          language = block.previousElementSibling.firstElementChild.textContent;
        } else {
          // bazaar readme
          language = block.className.replace("language-", "");
        }
        if (!hljs.getLanguage(language)) {
          language = "plaintext";
        }
        block.classList.add("hljs");
        block.setAttribute("data-render", "true");
        const autoEnter = block.parentElement.getAttribute("linewrap");
        const ligatures = block.parentElement.getAttribute("ligatures");
        const lineNumber = block.parentElement.getAttribute("linenumber");
        if (
          autoEnter === "true" ||
          (autoEnter !== "false" && window.siyuan.config.editor.codeLineWrap)
        ) {
          block.style.setProperty("white-space", "pre-wrap");
          block.style.setProperty("word-break", "break-all");
        } else {
          // https://ld246.com/article/1684031600711 该属性会导致有 tab 后光标跳至末尾，目前无解
          block.style.setProperty("white-space", "pre");
          block.style.setProperty("word-break", "initial");
        }
        if (
          ligatures === "true" ||
          (ligatures !== "false" && window.siyuan.config.editor.codeLigatures)
        ) {
          block.style.fontVariantLigatures = "normal";
        } else {
          block.style.fontVariantLigatures = "none";
        }
        const languageElement = block.parentElement.querySelector(
          ".protyle-action__language"
        ) as HTMLElement;
        if (
          !isPreview &&
          (lineNumber === "true" ||
            (lineNumber !== "false" &&
              window.siyuan.config.editor.codeSyntaxHighlightLineNum))
        ) {
          // 需要先添加 class 以防止抖动 https://ld246.com/article/1648116585443
          block.classList.add("protyle-linenumber");
          setTimeout(
            () => {
              // windows 需等待字体下载完成再计算，否则导致不换行，高度计算错误
              // https://github.com/siyuan-note/siyuan/issues/9029
              lineNumberRender(block);
            },
            block.getAttribute("contenteditable") === "true"
              ? 0
              : Constants.TIMEOUT_DBLCLICK
          );
          if (languageElement) {
            languageElement.style.marginLeft = "3.6em";
          }
        } else if (
          block.nextElementSibling?.classList.contains(
            "protyle-linenumber__rows"
          )
        ) {
          block.classList.remove("protyle-linenumber");
          block.nextElementSibling.remove();
          if (languageElement) {
            languageElement.style.marginLeft = "";
          }
        }
        // 搜索定位
        const layoutElement = hasClosestByClassName(
          block,
          "search__layout",
          true
        );
        if (
          layoutElement &&
          block.parentElement.getAttribute("data-node-id") ===
            layoutElement
              .querySelector("#searchList > .b3-list-item--focus")
              ?.getAttribute("data-node-id")
        ) {
          const matchElement = block.querySelector(
            'span[data-type="search-mark"]'
          );
          if (matchElement) {
            matchElement.scrollIntoView();
          }
        }
        block.innerHTML = hljs.highlight(
          block.textContent + (block.textContent.endsWith("\n") ? "" : "\n"), // https://github.com/siyuan-note/siyuan/issues/4609
          {
            language,
            ignoreIllegals: true,
          }
        ).value;
        if (wbrElement && getSelection().rangeCount > 0) {
          focusByOffset(block, startIndex, startIndex);
        }
      });
    });
  });
};

export const processRender = (previewPanel: Element) => {
  const language = previewPanel.getAttribute("data-subtype");
  if (!["abc", "plantuml", "mermaid", "flowchart", "echarts", "mindmap", "graphviz", "math"].includes(language) || previewPanel.getAttribute("data-type") !== "NodeHTMLBlock") {
      abcRender(previewPanel);
      htmlRender(previewPanel);
      plantumlRender(previewPanel);
      mermaidRender(previewPanel);
      flowchartRender(previewPanel);
      chartRender(previewPanel);
      mindmapRender(previewPanel);
      graphvizRender(previewPanel);
      mathRender(previewPanel);
      return;
  }
  if (language === "abc") {
      abcRender(previewPanel);
  } else if (language === "plantuml") {
      plantumlRender(previewPanel);
  } else if (language === "mermaid") {
      mermaidRender(previewPanel);
  } else if (language === "flowchart") {
      flowchartRender(previewPanel);
  } else if (language === "echarts") {
      chartRender(previewPanel);
  } else if (language === "mindmap") {
      mindmapRender(previewPanel);
  } else if (language === "graphviz") {
      graphvizRender(previewPanel);
  } else if (language === "math") {
      mathRender(previewPanel);
  } else if (previewPanel.getAttribute("data-type") === "NodeHTMLBlock") {
      htmlRender(previewPanel);
  }
};

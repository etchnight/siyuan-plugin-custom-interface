import { fetchSyncPost } from "siyuan";
import { BlockId } from "../../siyuanPlugin-common/types/siyuan-api";

export async function renderBreadcrumb(id: BlockId) {
  const element = document.createElement("div");
  element.className = "protyle-breadcrumb";
  element.innerHTML = `<div class="protyle-breadcrumb__bar"></div>
<span class="protyle-breadcrumb__space"></span>
`;
  let thisElement = element.firstElementChild as HTMLElement;
  const response = await fetchSyncPost("/api/block/getBlockBreadcrumb", {
    id,
    excludeTypes: [],
  });

  let html = "";
  response.data.forEach((item, index: number) => {
    if (index === 0 && false) {
      //?protyle.options.render.breadcrumbDocName
      html += `<span class="protyle-breadcrumb__item$" data-node-id="${
        item.id
      }"${response.data.length === 1 ? ' style="max-width:none"' : ""}>
    <svg class="popover__block" data-id="${
      item.id
    }"><use xlink:href="#${getIconByType(item.type, item.subType)}"></use></svg>
</span>`;
    } else {
      //*跳过最后一个面包屑
      html += `<span class="protyle-breadcrumb__item" data-node-id="${
        item.id
      }"${
        response.data.length === 1 || index === 0
          ? ' style="max-width:none"'
          : ""
      }>
        <svg class="popover__block" data-id="${item.id}">
          <use xlink:href="#${getIconByType(item.type, item.subType)}"></use>
        </svg>
        <span class="protyle-breadcrumb__text" title="${item.name}">${
        index !== response.data.length - 1 ? item.name : ""
      }</span>
      </span>`;
    }
    if (index !== response.data.length - 1) {
      html +=
        '<svg class="protyle-breadcrumb__arrow"><use xlink:href="#iconRight"></use></svg>';
    }
  });
  //console.log(html);
  thisElement.classList.remove("protyle-breadcrumb__bar--nowrap");
  thisElement.innerHTML = html;
  const itemElements = Array.from(
    thisElement.querySelectorAll(".protyle-breadcrumb__text")
  );
  if (itemElements.length === 0) {
    return;
  }
  let jump = false;
  while (thisElement.scrollHeight > 30 && !jump && itemElements.length > 1) {
    itemElements.find((item, index) => {
      if (index > 0) {
        if (!item.classList.contains("protyle-breadcrumb__text--ellipsis")) {
          item.classList.add("protyle-breadcrumb__text--ellipsis");
          return true;
        }
        if (
          index === itemElements.length - 1 &&
          item.classList.contains("protyle-breadcrumb__text--ellipsis")
        ) {
          jump = true;
        }
      }
    });
  }
  thisElement.classList.add("protyle-breadcrumb__bar--nowrap");
  if (thisElement.lastElementChild) {
    thisElement.scrollLeft =
      (thisElement.lastElementChild as HTMLElement).offsetLeft -
      thisElement.clientWidth +
      14;
  }
  document.createElement("div").appendChild(element);
  element.onclick = (e) => {
    e.stopPropagation();
  };
  return element;
}

export const getIconByType = (type: string, sub?: string) => {
  let iconName = "";
  switch (type) {
    case "NodeDocument":
      iconName = "iconFile";
      break;
    case "NodeThematicBreak":
      iconName = "iconLine";
      break;
    case "NodeParagraph":
      iconName = "iconParagraph";
      break;
    case "NodeHeading":
      if (sub) {
        iconName = "icon" + sub.toUpperCase();
      } else {
        iconName = "iconHeadings";
      }
      break;
    case "NodeBlockquote":
      iconName = "iconQuote";
      break;
    case "NodeList":
      if (sub === "t") {
        iconName = "iconCheck";
      } else if (sub === "o") {
        iconName = "iconOrderedList";
      } else {
        iconName = "iconList";
      }
      break;
    case "NodeListItem":
      iconName = "iconListItem";
      break;
    case "NodeCodeBlock":
    case "NodeYamlFrontMatter":
      iconName = "iconCode";
      break;
    case "NodeTable":
      iconName = "iconTable";
      break;
    case "NodeBlockQueryEmbed":
      iconName = "iconSQL";
      break;
    case "NodeSuperBlock":
      iconName = "iconSuper";
      break;
    case "NodeMathBlock":
      iconName = "iconMath";
      break;
    case "NodeHTMLBlock":
      iconName = "iconHTML5";
      break;
    case "NodeWidget":
      iconName = "iconBoth";
      break;
    case "NodeIFrame":
      iconName = "iconLanguage";
      break;
    case "NodeVideo":
      iconName = "iconVideo";
      break;
    case "NodeAudio":
      iconName = "iconRecord";
      break;
    case "NodeAttributeView":
      iconName = "iconDatabase";
      break;
  }
  return iconName;
};
export const hasClosestBlock = (element: Node) => {
  const nodeElement = hasClosestByAttribute(element, "data-node-id", null);
  if (
    nodeElement &&
    nodeElement.tagName !== "BUTTON" &&
    nodeElement.getAttribute("data-type")?.startsWith("Node")
  ) {
    return nodeElement;
  }
  return false;
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

export const getNoContainerElement = (element: Element) => {
  let childElement = element;
  while (childElement) {
    if (
      childElement.classList.contains("list") ||
      childElement.classList.contains("li") ||
      childElement.classList.contains("bq") ||
      childElement.classList.contains("sb")
    ) {
      childElement = childElement.querySelector("[data-node-id]");
    } else {
      return childElement;
    }
  }
  return false;
};

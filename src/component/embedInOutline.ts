import {
  DocOutline,
  getDocOutline,
} from "../../subMod/siyuanPlugin-common/siyuan-api/outline";
import {
  queryAncestorBlocks,
  queryBlockById,
  queryRefBlockById,
  requestQuerySQL,
} from "../../subMod/siyuanPlugin-common/siyuan-api/query";
import {
  BlockTree,
  Block,
  ETypeAbbrMap,
  BlockId,
} from "../../subMod/siyuanPlugin-common/types/siyuan-api.d";

export class embedInOutline {
  private outline: {
    update: (data: { data: DocOutline[] }) => void;
    tree: { data?: DocOutline[] };
    blockId: BlockId;
  };
  public isWatching: boolean;

  public init = () => {
    if (this.isWatching) {
      return;
    }
    const outlineEle = document.querySelector(".sy__outline");
    this.getTree();
    this.outlineObserver.observe(outlineEle, {
      childList: true,
      attributes: false,
      subtree: true,
    });
    this.isWatching = true;
  };
  private disConnect = () => {
    if (!this.isWatching) {
      return;
    }
    this.outlineObserver.disconnect();
    this.isWatching = false;
  };
  /**
   * 更新data方法
   *    1. 查询所有嵌入块
   *    2. 判断嵌入块指向块是否是标题
   *    3. 查询嵌入块的最近标题祖先
   *    4. 查询嵌入块指向块的子标题
   *    5. 嵌入块指向块的标题及子标题插入最近标题祖先子级中
   */
  private outlineObserver = new MutationObserver(
    async (mutationsList, observer) => {
      for (let mutation of mutationsList) {
        if (mutation.type === "attributes") {
          continue;
        }
      }
      if (
        !this.outline.tree ||
        !this.outline.tree.data ||
        this.outline.tree.data.length === 0
      ) {
        return;
      }
      this.disConnect();
      //1. 查询所有嵌入块
      let outlineData = this.outline.tree.data;
      //const block = await queryBlockById(outlineData.id);
      const embedBlocks = (await requestQuerySQL(
        `SELECT * FROM blocks WHERE blocks.type='query_embed' AND blocks.root_id='${this.outline.blockId}'      `
      )) as Block[];
      for (let embedBlock of embedBlocks) {
        //2. 判断嵌入块指向块是否是标题
        const embedRefBlock = await queryRefBlockById(embedBlock.id);
        //console.log("embedRefBlock", embedRefBlock);
        if (embedRefBlock.type !== "h" && embedRefBlock.type !== "d") {
          continue;
        }
        //3. 查询嵌入块的最近标题祖先
        const ancestors = await queryAncestorBlocks(embedBlock.id);
        const parent = ancestors.find((e) => {
          return e.type === "h";
        });
        let parentInTree: BlockTree | DocOutline = findInTree(
          outlineData,
          ["blocks", "children"],
          (e) => {
            return parent.id === e.id;
          }
        );
        //console.log("parentInTree", parentInTree);
        // 4. 查询嵌入块指向块的子标题
        const embedOutline = await getDocOutline(embedRefBlock.id);
        //console.log("embedOutline", embedOutline);
        let selfInTree: BlockTree | DocOutline = findInTree(
          embedOutline,
          ["blocks", "children"],
          (e) => {
            return embedRefBlock.id === e.id;
          }
        );
        if (embedRefBlock.type === "d") {
          let selfInTree2 = this.docOutline2BlockTree(embedRefBlock);
          selfInTree2.type = ETypeAbbrMap.d;
          selfInTree2.children = await Promise.all(
            embedOutline.map(async (e) => {
              const block = await queryBlockById(e.id);
              return this.docOutline2BlockTree(block, e);
            })
          );
          selfInTree = selfInTree2;
        }
        //console.log("selfInTree", selfInTree);
        const selfInTreeTrans = (
          "blocks" in selfInTree
            ? this.docOutline2BlockTree(embedRefBlock, selfInTree)
            : selfInTree
        ) as BlockTree;
        changeDepth(selfInTreeTrans, parentInTree.depth);
        if (parentInTree.type === "outline") {
          let parentInTree2 = parentInTree as DocOutline;
          if (!parentInTree2.blocks) {
            parentInTree2.blocks = [];
          }
          parentInTree.blocks.push(selfInTreeTrans);
          parentInTree = parentInTree2;
        } else {
          let parentInTree2 = parentInTree as BlockTree;
          if (!parentInTree2.children) {
            parentInTree2.children = [];
          }
          parentInTree2.children.push(selfInTreeTrans);
          parentInTree = parentInTree2;
        }
      }
      console.log("outlineData", outlineData);
      this.outline.update({ data: outlineData });
      this.init();
    }
  );
  private getTree = () => {
    this.outline = window.siyuan.layout.rightDock?.data?.outline;
    if (!this.outline) {
      this.outline = window.siyuan.layout.leftDock?.data?.outline;
    }
  };
  /**
   *
   * @returns 仅模拟，有些属性忽略了
   */
  private docOutline2BlockTree(
    embedRefBlock: Block,
    docOutline?: DocOutline
  ): BlockTree {
    let result: BlockTree = {
      ...embedRefBlock,
      rootID: embedRefBlock.root_id,
      parentID: embedRefBlock.root_id,
      folded: false,
      refText: "",
      refs: null,
      defID: null,
      defPath: "",
      children: docOutline?.blocks,
      depth: docOutline?.depth,
      count: 0,
      riffCardID: "",
      riffCard: null,
      hPath: embedRefBlock.hpath,
      subType: embedRefBlock.subtype,
      type: ETypeAbbrMap.h,
    };

    return result;
  }
}
function changeDepth(tree: BlockTree, depth: number) {
  if (!tree.children) {
    return;
  }
  tree.depth = depth + 1;
  for (let child of tree.children) {
    changeDepth(child, depth + 1);
  }
}
/**
 *
 * @param tree
 * @param key 作为children字段的key
 * @returns
 */
function findInTree(tree: any, keys: string[], callback: (e: any) => boolean) {
  if (Array.isArray(tree)) {
    for (let item of tree) {
      let result = findInTree(item, keys, callback);
      if (result) {
        return result;
      }
    }
  } else {
    if (callback(tree)) {
      return tree;
    }
  }

  for (let key of keys) {
    if (!tree[key] || !Array.isArray(tree[key])) {
      continue;
    }
    for (let child of tree[key]) {
      let result = findInTree(child, keys, callback);
      if (result) {
        return result;
      }
    }
  }
}

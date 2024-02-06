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
} from "../../subMod/siyuanPlugin-common/types/siyuan-api.d";

export class embedInOutline {
  private outline: {
    update: (data: { data: DocOutline[] }) => void;
    tree: { data: DocOutline[] };
  };
  public disConnect = this.disConnect2.bind(this);
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
  private disConnect2() {
    if (!this.isWatching) {
      return;
    }
    this.outlineObserver.disconnect();
    this.isWatching = false;
  }
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
      if (!this.outline.tree || this.outline.tree.data.length === 0) {
        return;
      }
      this.disConnect();
      //1. 查询所有嵌入块
      let outlineData = this.outline.tree.data[0];
      const block = await queryBlockById(outlineData.id);
      const embedBlocks = (await requestQuerySQL(
        `SELECT * FROM blocks WHERE blocks.type='query_embed' AND blocks.root_id='${block.root_id}'      `
      )) as Block[];
      for (let embedBlock of embedBlocks) {
        //2. 判断嵌入块指向块是否是标题
        const embedRefBlock = await queryRefBlockById(embedBlock.id);
        if (embedRefBlock.type !== "h") {
          continue;
        }
        //todo 处理方法
        if (!outlineData || outlineData.blocks.length == 0) {
          continue;
        }
        //3. 查询嵌入块的最近标题祖先
        const ancestors = await queryAncestorBlocks(embedBlock.id);
        const parent = ancestors.find((e) => {
          return e.type === "h";
        });
        let parentInTree: BlockTree = findInTree(
          outlineData,
          ["blocks", "children"],
          (e) => {
            return parent.id === e.id;
          }
        );
        // 4. 查询嵌入块指向块的子标题
        const embedOutline = (await getDocOutline(embedRefBlock.id))[0];
        //console.log("embedOutline", embedOutline);
        let selfInTree: BlockTree | DocOutline = findInTree(
          embedOutline,
          ["blocks", "children"],
          (e) => {
            return embedRefBlock.id === e.id;
          }
        );
        if (!parentInTree.children) {
          parentInTree.children = [];
        }
        const selfInTreeTrans = (
          "blocks" in selfInTree
            ? this.docOutline2BlockTree(selfInTree, embedRefBlock)
            : selfInTree
        ) as BlockTree;
        changeDepth(selfInTreeTrans, parentInTree.depth);
        //console.log("parentInTree", parentInTree);
        //console.log("selfInTree", selfInTree);
        parentInTree.children.push(selfInTreeTrans);
      }
      //console.log("outlineData", outlineData);
      this.outline.update({ data: [outlineData] });
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
    docOutline: DocOutline,
    embedRefBlock: Block
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
      children: docOutline.blocks,
      depth: docOutline.depth,
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

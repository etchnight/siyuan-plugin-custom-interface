import {
  DocOutline,
  getDocOutline,
} from "../../subMod/siyuanPlugin-common/siyuan-api/outline";
import {
  queryBlockById,
  queryRefBlockByBlock,
  requestQuerySQL,
} from "../../subMod/siyuanPlugin-common/siyuan-api/query";
import {
  BlockTree,
  Block,
  ETypeAbbrMap,
  BlockId,
} from "../../subMod/siyuanPlugin-common/types/siyuan-api.d";
import { TreeTools } from "../../subMod/js-utility-function/src/tree";
import { Dev, sleep } from "../../subMod/js-utility-function/src/other";

export class EmbedInOutline {
  private outline: {
    update: (data: { data: DocOutline[] }) => void;
    tree: { data?: DocOutline[] };
    blockId: BlockId;
  };
  private dev = new Dev(false);
  public isWatching: boolean;
  //private lastTree: BlockTree;
  private changeTime = new Date();
  public init = () => {
    if (this.isWatching) {
      return;
    }
    const outlineEle = document.querySelector(".sy__outline");
    this.outlineObserver.observe(outlineEle, {
      childList: true,
      attributes: false,
      subtree: true,
    });
    this.isWatching = true;
  };
  public disConnect = () => {
    if (!this.isWatching) {
      return;
    }
    this.outlineObserver.disconnect();
    this.isWatching = false;
  };
  /**
   *
   * @returns 仅模拟，有些属性忽略了
   */
  private docOutline2BlockTree = (
    block: Block,
    docOutline?: DocOutline
  ): BlockTree => {
    let result: BlockTree = {
      ...block,
      rootID: block.root_id,
      parentID: block.root_id,
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
      hPath: block.hpath,
      subType: block.subtype,
      type: ETypeAbbrMap[block.type],
    };
    return result;
  };
  private docOutlineList2BlockTrees = async (docOutline: DocOutline[]) => {
    let result: BlockTree[] = await Promise.all(
      docOutline.map(async (e) => {
        const block = await queryBlockById(e.id);
        return this.docOutline2BlockTree(block, e);
      })
    );
    return result;
  };
  private blockTree2docOutline = (blockTree: BlockTree): DocOutline => {
    return {
      id: blockTree.id,
      box: blockTree.box,
      name: blockTree.name || blockTree.content,
      hPath: blockTree.hPath,
      type: "outline",
      nodeType: blockTree.type,
      subType: blockTree.subType,
      blocks: blockTree.children,
      depth: blockTree.depth,
      count: blockTree.count,
      updated: blockTree.updated,
      created: blockTree.created,
    };
  };

  /**
   * 更新data方法
   *    1. 查询所有嵌入块
   *    2. 判断嵌入块指向块是否是标题
   *    3. 查询嵌入块的最近标题祖先
   *    4. 查询嵌入块指向块的子标题
   *    5. 嵌入块指向块的标题及子标题插入最近标题祖先子级中
   */
  private changeOutline = async () => {
    this.getTree();
    if (
      !this.outline.tree ||
      !this.outline.tree.data ||
      this.outline.tree.data.length === 0
    ) {
      return;
    }
    this.dev.log("原始outline", this.outline.tree.data);
    const outlineData: BlockTree[] = await this.docOutlineList2BlockTrees(
      this.outline.tree.data
    );
    //this.disConnect();
    //1. 查询所有嵌入块
    //let outlineData = this.outline.tree.data;
    //console.log(outlineData)
    //const block = await queryBlockById(outlineData.id);
    const embedBlocks = (await requestQuerySQL(
      `SELECT * FROM blocks WHERE blocks.type='query_embed' AND blocks.root_id='${this.outline.blockId}'`
    )) as Block[];
    this.dev.log("embedBlocks", embedBlocks);
    const forEachEmbedBlock = async (embedBlock: Block) => {
      //2. 判断嵌入块指向块是否是标题
      //const embedRefBlocks = await queryRefBlockById(embedBlock.id);
      const embedRefBlocks = await queryRefBlockByBlock(embedBlock);
      this.dev.log("embedRefBlock", embedRefBlocks);
      await this.dev.devMap(embedRefBlocks, async (embedRefBlock) => {
        if (embedRefBlock.type !== "h" && embedRefBlock.type !== "d") {
          return;
        }
        //3. 查询嵌入块的最近标题祖先
        const findParentInTree = async () => {
          /*大多数情况下 嵌入块的最近标题祖先 只用一次即可以查询到，使用递归效率太慢
          const ancestors = await queryAncestorBlocks(embedBlock.id);
          const parent = ancestors.find((e) => {
            return e.type === "h";
          }); */
          let parent = await queryBlockById(embedBlock.parent_id);
          while (parent.type !== "h" && parent.parent_id) {
            parent = await queryBlockById(parent.parent_id);
          }
          const parentInTree = TreeTools.findNodeStatic(outlineData, (e) => {
            return parent.id === e.id;
          });
          this.dev.log("parentInTree", parentInTree);
          return parentInTree;
        };
        // 4. 查询嵌入块指向块的子标题
        const findSelfInTree = async () => {
          const embedOutline = await getDocOutline(embedRefBlock.id);
          this.dev.log("embedOutline", embedOutline);
          const embedOutlineChild = await this.docOutlineList2BlockTrees(
            embedOutline
          );
          let embedOutlineTree: BlockTree[];
          //文档在outline中是不存在的
          if (embedRefBlock.type == "d") {
            embedOutlineTree = [this.docOutline2BlockTree(embedRefBlock)];
            embedOutlineTree[0].children = embedOutlineChild;
          } else {
            embedOutlineTree = embedOutlineChild;
          }
          let selfInTree: BlockTree = TreeTools.findNodeStatic(
            embedOutlineTree,
            (e) => {
              return embedRefBlock.id === e.id;
            }
          );
          const selfInTree2 = TreeTools.forEachStatic([selfInTree], (e) => {
            e.id = embedBlock.id;
          });
          selfInTree = selfInTree2[0];
          this.dev.log("selfInTree", selfInTree);
          return selfInTree;
        };
        const [parentInTree, selfInTree] = await Promise.all([
          findParentInTree(),
          findSelfInTree(),
        ]);
        changeDepth(selfInTree, parentInTree?.depth);
        if (parentInTree) {
          if (!parentInTree.children) {
            parentInTree.children = [];
          }
          parentInTree.children.push(selfInTree);
        } else {
          outlineData.unshift(selfInTree);
        }
      });
    };
    await this.dev.devMap(embedBlocks, forEachEmbedBlock);
    //*重新转换为大纲
    const outline = outlineData.map((e) => {
      return this.blockTree2docOutline(e);
    });
    this.dev.log("outlineData", outline);
    this.disConnect();

    this.outline.update({ data: outline });
    await sleep(100);
    this.init();
  };
  private outlineObserver = new MutationObserver(
    async (mutationsList, observer) => {
      /*       
      for (let mutation of mutationsList) {
        if (mutation.type === "attributes") {
          continue;
        }
      } */
      this.dev.log("mutationsList", mutationsList);
      //每次变化都会更新时间，xx ms 后，如果changeTime仍等于date，说明是最后一次变动
      //如果date.valueOf() - this.changeTime.valueOf()为负，说明this.changeTime已更新
      const date = new Date();
      this.changeTime = new Date();
      setTimeout(() => {
        if (date.valueOf() === this.changeTime.valueOf()) {
          this.changeOutline();
        }
      }, 1000);
    }
  );

  private getTree = () => {
    this.outline = window.siyuan.layout.rightDock?.data?.outline;
    if (!this.outline) {
      this.outline = window.siyuan.layout.leftDock?.data?.outline;
    }
  };
}
function changeDepth(tree: BlockTree, depth: number = -1) {
  tree.depth = depth + 1;
  if (!tree.children) {
    return;
  }
  for (let child of tree.children) {
    changeDepth(child, depth + 1);
  }
}

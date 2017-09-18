import { BoardSize } from "./BoardSize";
import { Jetpack } from "./Jetpack";
import { Loader } from "./Loader";
import { SavedLevel } from "./SavedLevel";

export class Levels {
  public levelID: number = 0;
  protected levels: object = {};
  protected jetpack: Jetpack;
  protected loader: Loader;

  constructor(jetpack: Jetpack, loader: Loader) {
    this.jetpack = jetpack;
    this.loader = loader;
  }

  public getLevelList(callback) {
    this.loader.callServer(
      "getLevelsList",
      {},
      data => {
        const levelList = this.cleanLevelList(data);
        callback(levelList);
      },
      () => {
        const levelList = this.cleanLevelList([]);
        callback(levelList);
      }
    );
  }

  public populateLevelsList(levelList): void {
    const select = document.getElementById("levelList");

    if (!select) {
      return;
    }

    while (select.firstChild) {
      select.removeChild(select.firstChild);
    }
    const nullEl = document.createElement("option");
    nullEl.textContent = "New";
    nullEl.value = "";
    if (!this.levelID) {
      nullEl.selected = true;
    }
    select.appendChild(nullEl);

    for (const i in levelList) {
      if (levelList[i] !== undefined) {
        const levelID: number = parseInt(i);
        const el = document.createElement("option");
        el.textContent = levelID.toString();
        el.value = levelID.toString();
        if (levelID === this.levelID) {
          el.selected = true;
        }
        select.appendChild(el);
      }
    }
  }

  public saveLevel(
    board: object,
    boardSize: BoardSize,
    levelID: number,
    callback: (num: number) => any
  ): void {
    const saveData = new SavedLevel(boardSize, board, levelID);
    const saveString: string = saveData.toString();
    const params = {
      data: saveString,
      levelID: 0
    };
    if (levelID) {
      params.levelID = levelID;
    }
    this.loader.callServer(
      "saveLevel",
      params,
      savedLevelID => {
        this.levelID = savedLevelID;
        callback(savedLevelID);
      },
      (errorMsg: string) => {
        // console.log("ERROR: ", errorMsg);
      }
    );
  }

  public loadLevel(
    levelID: number,
    callback: (SavedLevel) => any,
    failCallback: () => any
  ): void {
    this.getLevelList(() => {
      console.log("gotLevelList");
    });
    const params = {
      levelID
    };
    this.loader.callServer(
      "getLevel",
      params,
      data => {
        this.levelID = levelID;
        const boardSize = new BoardSize(data.boardSize.width);
        const savedLevel = new SavedLevel(boardSize, data.board, levelID);
        callback(savedLevel);
      },
      (errorMsg: string) => {
        // console.log("ERROR: ", errorMsg);
        failCallback();
      }
    );
  }

  public saveData(
    levelID: number,
    rotationsUsed: number,
    score: number,
    callback: (object) => any
  ): void {
    const params = {
      levelID,
      rotationsUsed,
      score
    };
    this.loader.callServer(
      "saveScore",
      params,
      (data: object) => {
        callback(data);
      },
      () => {
        callback({ msg: "call failed" });
      }
    );
  }

  // turn array of numbers into list key'd by levelID with object of won/lost
  protected cleanLevelList(list) {
    const levelList = [];
    for (const i in list) {
      if (list[i] !== undefined) {
        const levelID = parseInt(list[i], 10);
        levelList[levelID] = {
          completed: false,
          levelID
        };
      }
    }
    return levelList;
  }
}

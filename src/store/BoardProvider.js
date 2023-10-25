import { useReducer } from "react";
import {
  BOARD_ACTIONS,
  COLORS,
  TOOL_ACTION_TYPES,
  TOOL_ITEMS,
} from "../constants";
import { createRoughElement, isPointNearElement } from "../utils/element";
import { midPointBtw } from "../utils/math";
import BoardContext from "./board-context";

const initialBoardState = {
  activeToolItem: TOOL_ITEMS.LINE,
  toolActionType: TOOL_ACTION_TYPES.NONE,
  drawing: false,
  elements: [],
  points: [],
  path: [],
  selectedElement: null,
};

const boardReducer = (state, action) => {
  switch (action.type) {
    case BOARD_ACTIONS.CHANGE_TOOL:
      return { ...state, activeToolItem: action.payload.tool };
    case BOARD_ACTIONS.CHANGE_ACTION_TYPE:
      return { ...state, toolActionType: action.payload.actionType };
    case BOARD_ACTIONS.SKETCH_DOWN: {
      const transparency = "1.0";
      const newEle = {
        clientX: action.payload.clientX,
        clientY: action.payload.clientY,
        stroke: action.payload.strokeColor,
        strokeWidth: action.payload.strokeWidth,
        transparency,
      };
      const newPencilToolPoints = [...state.points, newEle];
      return {
        ...state,
        points: newPencilToolPoints,
        toolActionType: TOOL_ACTION_TYPES.SKETCHING,
        drawing: true,
      };
    }
    case BOARD_ACTIONS.DRAW_DOWN: {
      const id = state.elements.length;
      const { clientX, clientY, size, strokeColor, fillColor } = action.payload;
      const newElement = createRoughElement(
        id,
        clientX,
        clientY,
        clientX,
        clientY,
        {
          type: state.activeToolItem,
          stroke: strokeColor,
          fill: fillColor,
          size,
        }
      );
      const newElements = [...state.elements, newElement];
      return {
        ...state,
        elements: newElements,
        toolActionType: TOOL_ACTION_TYPES.DRAWING,
        selectedElement: newElement,
        drawing: true,
      };
    }
    case BOARD_ACTIONS.ERASE: {
      const { clientX, clientY } = action.payload;
      const newElements = state.elements.filter((ele) => {
        return !isPointNearElement(ele, {
          pointX: clientX,
          pointY: clientY,
        });
      });
      return {
        ...state,
        elements: newElements,
        toolActionType: TOOL_ACTION_TYPES.ERASING,
      };
    }
    case BOARD_ACTIONS.SKETCH_MOVE: {
      const curPoints = state.points;
      const transparency = curPoints[curPoints.length - 1].transparency;
      const newEle = {
        clientX: action.payload.clientX,
        clientY: action.payload.clientY,
        stroke: action.payload.strokeColor,
        strokeWidth: action.payload.strokeWidth,
        transparency,
      };
      const newPencilToolPoints = [...state.points, newEle];
      return { ...state, points: newPencilToolPoints };
    }
    case BOARD_ACTIONS.DRAW_MOVE: {
      const { clientX, clientY, strokeColor, fillColor, size } = action.payload;
      const index = state.elements.length - 1;
      const { x1, y1, type } = state.elements[index];
      const newEle = createRoughElement(index, x1, y1, clientX, clientY, {
        type,
        stroke: strokeColor,
        fill: fillColor,
        size,
      });
      const elementsCopy = [...state.elements];
      elementsCopy[index] = newEle;
      return { ...state, elements: elementsCopy };
    }
    case BOARD_ACTIONS.DRAW_UP: {
      const index = state.selectedElement.id;
      const elements = state.elements;
      const { x1, y1, x2, y2, id, type } = elements[index];
      // const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
      const newEle = createRoughElement(id, x1, y1, x2, y2, {
        type,
        stroke: action.payload.strokeColor,
        fill: action.payload.fillColor,
        size: action.payload.size,
      });
      const elementsCopy = [...state.elements];
      elementsCopy[id] = newEle;

      return {
        ...state,
        elements: elementsCopy,
      };
    }
    case BOARD_ACTIONS.SKETCH_UP: {
      const curPoints = state.points;
      return {
        ...state,
        path: [...state.path, curPoints],
        points: [],
        drawing: false,
      };
    }
    default: {
      return state;
    }
  }
};

export const BoardContextProvider = ({ children }) => {
  const [boardState, dispatchBoardAction] = useReducer(
    boardReducer,
    initialBoardState
  );

  const changeToolHandler = (tool) => {
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_TOOL,
      payload: { tool },
    });
  };

  const boardMouseDownHandler = (event, context, toolboxState) => {
    const { clientX, clientY } = event;
    if (boardState.activeToolItem === TOOL_ITEMS.PENCIL) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.SKETCH_DOWN,
        payload: {
          clientX,
          clientY,
          strokeColor: toolboxState[boardState.activeToolItem].stroke,
          strokeWidth: toolboxState[boardState.activeToolItem].size,
        },
      });
      context.moveTo(clientX, clientY);
      context.beginPath();
    } else if (
      boardState.activeToolItem === TOOL_ITEMS.LINE ||
      boardState.activeToolItem === TOOL_ITEMS.RECTANGLE ||
      boardState.activeToolItem === TOOL_ITEMS.CIRCLE ||
      boardState.activeToolItem === TOOL_ITEMS.ARROW
    ) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_DOWN,
        payload: {
          clientX,
          clientY,
          strokeColor: toolboxState[boardState.activeToolItem]?.stroke,
          fillColor: toolboxState[boardState.activeToolItem]?.fill,
          size: toolboxState[boardState.activeToolItem].size,
        },
      });
    } else if (boardState.activeToolItem === TOOL_ITEMS.ERASER) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.ERASE,
        payload: {
          clientX,
          clientY,
        },
      });
    }
  };

  const boardMouseUpHandler = (event, context, toolboxState) => {
    if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_UP,
        payload: {
          strokeColor: toolboxState[boardState.activeToolItem]?.stroke,
          fillColor: toolboxState[boardState.activeToolItem]?.fill,
          size: toolboxState[boardState.activeToolItem].size,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.SKETCHING) {
      context.closePath();
      dispatchBoardAction({
        type: BOARD_ACTIONS.SKETCH_UP,
      });
    }
    dispatchBoardAction({
      type: BOARD_ACTIONS.CHANGE_ACTION_TYPE,
      payload: {
        actionType: TOOL_ACTION_TYPES.NONE,
      },
    });
  };

  const boardMouseMoveHandler = (event, context, toolboxState) => {
    const { clientX, clientY } = event;
    if (boardState.toolActionType === TOOL_ACTION_TYPES.SKETCHING) {
      if (!boardState.drawing) return;
      dispatchBoardAction({
        type: BOARD_ACTIONS.SKETCH_MOVE,
        payload: {
          clientX,
          clientY,
          strokeColor: toolboxState[boardState.activeToolItem].stroke,
          strokeWidth: toolboxState[boardState.activeToolItem].size,
        },
      });
      const midPoint = midPointBtw(clientX, clientY);
      context.quadraticCurveTo(clientX, clientY, midPoint.x, midPoint.y);
      context.lineTo(clientX, clientY);
      context.strokeStyle =
        toolboxState[boardState.activeToolItem].stroke || COLORS.BLACK;
      context.lineWidth = toolboxState[boardState.activeToolItem].size;
      context.stroke();
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.DRAWING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.DRAW_MOVE,
        payload: {
          clientX,
          clientY,
          strokeColor: toolboxState[boardState.activeToolItem].stroke,
          fillColor: toolboxState[boardState.activeToolItem].fill,
          size: toolboxState[boardState.activeToolItem].size,
        },
      });
    } else if (boardState.toolActionType === TOOL_ACTION_TYPES.ERASING) {
      dispatchBoardAction({
        type: BOARD_ACTIONS.ERASE,
        payload: {
          clientX,
          clientY,
        },
      });
    }
  };

  const boardContext = {
    activeToolItem: boardState.activeToolItem,
    toolActionType: boardState.toolActionType,
    drawing: boardState.drawing,
    elements: boardState.elements,
    points: boardState.points,
    path: boardState.path,
    selectedElement: boardState.selectedElement,
    changeTool: changeToolHandler,
    boardMouseDown: boardMouseDownHandler,
    boardMouseMove: boardMouseMoveHandler,
    boardMouseUp: boardMouseUpHandler,
  };

  return (
    <BoardContext.Provider value={boardContext}>
      {children}
    </BoardContext.Provider>
  );
};

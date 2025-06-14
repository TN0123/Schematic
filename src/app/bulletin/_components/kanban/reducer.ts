import { KanbanState, KanbanAction } from "./types";

export function kanbanReducer(
  state: KanbanState,
  action: KanbanAction
): KanbanState {
  switch (action.type) {
    case "SET_STATE":
      return { ...state, ...action.payload };
    case "ADD_COLUMN":
      return { ...state, columns: [...state.columns, action.payload] };
    case "UPDATE_COLUMN":
      return {
        ...state,
        columns: state.columns.map((col) =>
          col.id === action.payload.id
            ? { ...col, ...action.payload.updates }
            : col
        ),
      };
    case "REMOVE_COLUMN":
      return {
        ...state,
        columns: state.columns.filter((col) => col.id !== action.payload.id),
        cards: state.cards.filter(
          (card) => card.columnId !== action.payload.id
        ),
      };
    case "SET_COLUMNS":
      return { ...state, columns: action.payload };
    case "ADD_CARD":
      return { ...state, cards: [...state.cards, action.payload] };
    case "UPDATE_CARD":
      return {
        ...state,
        cards: state.cards.map((card) =>
          card.id === action.payload.id
            ? { ...card, ...action.payload.updates }
            : card
        ),
      };
    case "REMOVE_CARD":
      return {
        ...state,
        cards: state.cards.filter((card) => card.id !== action.payload.id),
      };
    case "SET_CARDS":
      return { ...state, cards: action.payload };
    case "UPDATE_FILTERS":
      return {
        ...state,
        filters: { ...state.filters, ...action.payload },
      };
    case "TOGGLE_FILTERS":
      return { ...state, showFilters: !state.showFilters };
    case "TOGGLE_OVERVIEW":
      return { ...state, showOverview: !state.showOverview };
    default:
      return state;
  }
}

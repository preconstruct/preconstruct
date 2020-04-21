// @ts-ignore (installed during test)
import { combineReducers } from '@reduxjs/toolkit';

export const rootReducer = combineReducers({
    /* blah blah blah */
});

export type RootState = ReturnType<typeof rootReducer>;

// @ts-ignore (installed during test)
import { configureStore, Action } from '@reduxjs/toolkit';
import { ThunkAction } from 'redux-thunk';
import { rootReducer, RootState } from './root-reducer';

export type AppThunk = ThunkAction<void, RootState, unknown, Action<string>>;

export function createStore() {
    return configureStore<RootState>({
        reducer: rootReducer,
    });
}

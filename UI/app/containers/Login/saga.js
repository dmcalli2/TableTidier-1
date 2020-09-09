import { take, call, put, select, takeLatest } from 'redux-saga/effects';
import { LOGIN_ACTION } from './constants';
import { loginAction, loginSuccessAction, loginFailedAction } from './actions';
import { makeSelectLogin } from './selectors';

import request from '../../utils/request';
// import HttpClient from '../../network/http-client';
// import { URL_BASE } from '../../links'
// const urlBase = URL_BASE + 'api/'
// const httpClient = new HttpClient()

export function* doLogin() {

  const login_details = yield select(makeSelectLogin());
  const requestURL = `http://localhost:6541/login`;

  const params = new URLSearchParams( { 'username': login_details.username, 'password': login_details.password });

  const options = {
    method: 'POST',
    body: params
  }

  try {
    const response = yield call(request, requestURL, options);

    console.log("LOGIN: "+response.status);

    if ( response.status && response.status == "unauthorised"){
      yield put( yield loginFailedAction(response.status));
    } else {
      yield put( yield loginSuccessAction(response.payload.hash));
    }
  } catch (err) {
    yield put(loginFailedAction(err));
  }

}

// Individual exports for testing
export default function* loginSaga() {
  // See example in containers/HomePage/saga.js
  yield takeLatest(LOGIN_ACTION, doLogin);
}

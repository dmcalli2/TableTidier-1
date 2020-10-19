/*
 *
 * Annotator actions
 *
 */

import {
  LOAD_TABLE_CONTENT_ACTION,
  LOAD_TABLE_ANNOTATIONS_ACTION,
  LOAD_TABLE_RESULTS_ACTION,
  LOAD_TABLE_METADATA_ACTION,

  UPDATE_TABLE_CONTENT_ACTION,
  UPDATE_TABLE_ANNOTATIONS_ACTION,
  UPDATE_TABLE_RESULTS_ACTION,
  UPDATE_TABLE_METADATA_ACTION,

  SAVE_TABLE_CONTENT_ACTION,
  SAVE_TABLE_ANNOTATIONS_ACTION,
  SAVE_TABLE_RESULTS_ACTION,
  SAVE_TABLE_METADATA_ACTION,
} from './constants';


export function loadTableContentAction(docid, page, collId) {
  return {
    type: LOAD_TABLE_CONTENT_ACTION,
    docid, page, collId
  };
}

export function updateTableContentAction(tableData) {
  return {
    type: UPDATE_TABLE_CONTENT_ACTION,
    tableData,
  };
}


export function loadTableAnnotationsAction(docid, page, collId) {
  return {
    type: LOAD_TABLE_ANNOTATIONS_ACTION,
    docid, page, collId
  };
}

export function updateTableAnnotationsAction(annotations) {
  return {
    type: UPDATE_TABLE_ANNOTATIONS_ACTION,
    annotations,
  };
}

export function loadTableResultsAction(docid, page, collId) {
  return {
    type: LOAD_TABLE_RESULTS_ACTION,
    docid, page, collId
  };
}

export function loadTableMetadataAction(docid, page, collId) {
  return {
    type: LOAD_TABLE_METADATA_ACTION,
    docid, page, collId
  };
}

/**
 *
 * TableMetadata
 *
 */

import React, { memo } from 'react';
// import PropTypes from 'prop-types';
// import styled from 'styled-components';

import { FormattedMessage } from 'react-intl';
import messages from './messages';

import {
  Card, Checkbox,
  Select as SelectField,
  TextField,
  Button,
  Paper,
  Drawer,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  AppBar,
  Toolbar,
  Typography,
  Switch,
} from '@material-ui/core';

import TableMetadataItem from 'components/TableMetadataItem'

function TableMetadata({
  tableResults
}) {

  debugger

  return (
    <div style={{padding:"5px 7px 7px 7px"}} >
      <div style={{textAlign:"right", marginBottom:5}}>
        <div style={{height:35, fontSize:22, float:"left", paddingTop:5}}> 4. <b> Metadata </b> Linking </div>
        <Button variant="outlined" style={{backgroundColor:"lightblue"}} onClick={ () => {} }> Save Metadata Changes </Button>
      </div>


      {
        // HEre
      }
      <TableMetadataItem itemData={{concept: "", proposed:"", proposed_user:"", selected:""}} />

      </div>
  );
}

TableMetadata.propTypes = {};

export default memo(TableMetadata);

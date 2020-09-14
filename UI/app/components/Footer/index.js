/**
 *
 * Footer
 *
 */

import React from 'react';
// import PropTypes from 'prop-types';
// import styled from 'styled-components';

import { FormattedMessage } from 'react-intl';
import messages from './messages';

import Card from '@material-ui/core/Card'

function Footer() {
  return (
    <Card style={{padding:20, marginTop:20}}>
      <div>
        University of Glasgow 2020
      </div>
    </Card>
  );
}

Footer.propTypes = {};

export default Footer;
import React, { Fragment, useState } from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Drawer from '@material-ui/core/Drawer';
import CssBaseline from '@material-ui/core/CssBaseline';
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import List from '@material-ui/core/List';
import Typography from '@material-ui/core/Typography';
import Divider from '@material-ui/core/Divider';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import MenuBookIcon from '@material-ui/icons/MenuBook';
import ExitToAppIcon from '@material-ui/icons/ExitToApp';
import clsx from 'clsx';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import ChevronLeftIcon from '@material-ui/icons/ChevronLeft';
import ChevronRightIcon from '@material-ui/icons/ChevronRight';

import { Link } from "react-router-dom";

import logo from '../../assets/usairsoft-small-logo.png';

const drawerWidth = 240;

const AdminDrawer = ({ component }) => {
  const [Tab, setTab] = useState(0);

  const [open, setOpen] = React.useState(false);

  const handleDrawerOpen = () => {
    console.log("Opening");
    setOpen(true);
  };

  const handleDrawerClose = () => {
    console.log("closing");
    setOpen(false);
  };

  return (
    <Fragment >
      <CssBaseline />
      <AppBar position="fixed" className={open ? "appbar-opened-admin" : null}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerOpen}
            edge="start"
            className={open ? "iconbutton-opened-admin" : null}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap>
            Administrative Panel
          </Typography>
          <img src={logo} alt="US Airsoft logo" className="img-logo-admin" />
        </Toolbar>
      </AppBar>
      <Drawer
        variant="permanent"
        open={open}
        onClose={handleDrawerClose}
        className={open ? "drawer-opened-admin" : null}
      >
        {/* <div className={classes.toolbar && !open ? classes.hide : null}>
            <Row className={classes.row}>
                <Link to="/" className="justify-content-center-link">
                  <img src={logo} alt="US Airsoft logo" className="img-logo-admin"/>
                </Link>
            </Row>
        </div> */}
        <div className='spacer-div-admin-drawer'>
          {open ?
            <IconButton onClick={handleDrawerClose} className="close-button-admin">
              <ChevronLeftIcon />
            </IconButton> : null}
        </div>
        <Divider />
        <List className="list-admin-drawer">
          <ListItem button selected={Tab === 0} onClick={() => {
            setTab(0)
          }}>
            <ListItemIcon>{<MenuBookIcon />}</ListItemIcon>
            <ListItemText primary={"Pages"} />
          </ListItem>
        </List>
        <Divider />
        <List className="list-admin-drawer">
          <ListItem button selected={Tab === 1} onClick={() => {
            setTab(1)
          }}>
            <ListItemIcon>{ }</ListItemIcon>
            <ListItemText primary={"Test"} />
          </ListItem>
        </List>
        <Divider />
        <List className="list-admin-drawer last-tab-list-admin-drawer">
          <ListItem button component={Link} to="/" selected={Tab === 2} onClick={() => { }}>
            <ListItemIcon>{<ExitToAppIcon />}</ListItemIcon>
            <ListItemText primary={"Back to Website"} />
          </ListItem>
        </List>
      </Drawer>
      <main className='main-div-admin-drawer'>
        <div className='spacer-div-admin-drawer'>
        </div>
        {component}
      </main>
    </Fragment>
  );
}

export default AdminDrawer
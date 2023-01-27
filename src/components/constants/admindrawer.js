import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ExitToAppIcon from '@mui/icons-material/ExitToApp';
import MenuIcon from '@mui/icons-material/Menu';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import AppBar from '@mui/material/AppBar';
import CssBaseline from '@mui/material/CssBaseline';
import Divider from '@mui/material/Divider';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import React, { Fragment, useState } from 'react';

import { Link } from "react-router-dom";

import logo from '../../assets/usairsoft-small-logo.png';

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
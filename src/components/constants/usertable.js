import React from 'react';
import { makeStyles, useTheme } from '@material-ui/core/styles';
import Table from '@material-ui/core/Table';
import TableBody from '@material-ui/core/TableBody';
import TableCell from '@material-ui/core/TableCell';
import TableContainer from '@material-ui/core/TableContainer';
import TableFooter from '@material-ui/core/TableFooter';
import TablePagination from '@material-ui/core/TablePagination';
import TableRow from '@material-ui/core/TableRow';
import Paper from '@material-ui/core/Paper';
import IconButton from '@material-ui/core/IconButton';
import FirstPageIcon from '@material-ui/icons/FirstPage';
import KeyboardArrowLeft from '@material-ui/icons/KeyboardArrowLeft';
import KeyboardArrowRight from '@material-ui/icons/KeyboardArrowRight';
import LastPageIcon from '@material-ui/icons/LastPage';
import Box from '@material-ui/core/Box';
import Collapse from '@material-ui/core/Collapse';
import TableHead from '@material-ui/core/TableHead';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@material-ui/icons/KeyboardArrowUp';
import { Button } from '@material-ui/core';
import { Link } from 'react-router-dom';


function TablePaginationActions(props) {

  const useStyles1 = makeStyles((theme) => ({
    root: {
      flexShrink: 0,
      marginLeft: theme.spacing(2.5),
    },
  }));

  const classes = useStyles1();
  const theme = useTheme();
  const { count, page, rowsPerPage, onChangePage } = props;

  const handleFirstPageButtonClick = (event) => {
    onChangePage(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onChangePage(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onChangePage(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onChangePage(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };
    return (
    <div className={classes.root}>
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {theme.direction === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {theme.direction === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {theme.direction === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {theme.direction === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </div>
  );
}

export default function UserTable({users, index, search, length}) {
    const useStyles = makeStyles((theme) => ({
      root: {
        flexShrink: 0,
        marginLeft: theme.spacing(2.5),
      },
      table: {
        minWidth: 500,
      },
    }));


    const classes = useStyles();
    const [page, setPage] = React.useState(0);
    const [rowsPerPage, setRowsPerPage] = React.useState(5);

    // let checker = (arr, target) => target.every(v => arr.includes(v));

    const emptyRows = rowsPerPage - Math.min(rowsPerPage, length - page * rowsPerPage);

    const handleChangePage = (event, newPage) => {
      setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
      setRowsPerPage(parseInt(event.target.value, 10));
      setPage(0);
    };

    return (
      <TableContainer component={Paper}>
      <Table className={classes.table} aria-label="custom pagination table">
        <TableBody>
          {(rowsPerPage > 0
            ? users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            : users
          ).map((user, i) => (
            <MUITableRow user={user} rowsPerPage={rowsPerPage} page={page} index={i} key={user.uid}/>
          ))}

          {emptyRows > 0 && (
            <TableRow style={{ height: 53 * emptyRows }}>
              <TableCell colSpan={6} />
            </TableRow>
          )}
        </TableBody>
        <TableFooter className="user-table-footer">
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              colSpan={6}
              count={length}
              rowsPerPage={rowsPerPage}
              page={page}
              SelectProps={{
                inputProps: { 'aria-label': 'rows per page' },
                native: true,
              }}
              onChangePage={handleChangePage}
              onChangeRowsPerPage={handleChangeRowsPerPage}
              ActionsComponent={TablePaginationActions}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
    )


// Checks if given date is expired or not
function checkDate(dt) {
    if (dt === 'N/A')
        return false
    const dateArray = dt.split('-')
    const date = new Date(dateArray[2], dateArray[0]-1, dateArray[1])
    const today = new Date()
    if (date < today)
        return true // expired
    else 
        return false // not expired
}



function MUITableRow({ user, page, rowsPerPage, index }) {

    const useRowStyles = makeStyles({
        root: {
            '& > *': {
            borderBottom: 'unset',
            },
        },
        rootSelected: {
            '& > *': {
            borderBottom: 'unset',
            backgroundColor: 'rgba(44, 57, 74, .9)',
            },
        },
        cell: {
            color: 'rgba(255, 255, 255, .9)',
          },
        innerCell: {
            color: 'rgba(255, 255, 255, .9)',
            borderBottom: 'unset',
          },
        statusCell: {
            color: 'rgba(255, 255, 255, .9)',
            borderBottom: 'unset',
            backgroundColor: 'rgba(141, 141, 141, .1)',
          },
        rowSelected: {
            backgroundColor: 'rgba(44, 57, 74, .9)',
          },
        chevron: {
          color: 'rgba(255, 255, 255, .9)',
        },
        good: {
          backgroundColor: 'rgba(2, 231, 40, .24)',
          display: 'inherit',
          padding: '10px',
          borderRadius: '15px',
          fontWeight: '700',
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
          textTransform: 'uppercase',
          fontSize: '0.875rem',
          textShadow: '1px 1px #000000',
        },
        cautious: {

        },
        bad: {
          backgroundColor: 'rgba(251, 35, 55, .85)',
          display: 'inherit',
          padding: '10px',
          borderRadius: '15px',
          fontWeight: '700',
          fontFamily: 'Roboto, Helvetica, Arial, sans-serif',
          textTransform: 'uppercase',
          fontSize: '0.875rem',
          textShadow: '1px 1px #000000',
        },
    });

  const [open, setOpen] = React.useState(false);
  const classes = useRowStyles();

  const expired = checkDate(user.renewal)

  return (
    <React.Fragment>
      <TableRow className={ !open ? classes.root : classes.rootSelected}>
        <TableCell className={classes.cell}>
          <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}
          className={classes.chevron}>
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell component="th" scope="row" className={classes.cell}>
          {`(${(index+1)+(page*rowsPerPage)}) ${user.name}`}
        </TableCell>
        <TableCell align="right" className={classes.cell}>{user.username}</TableCell>
        <TableCell align="right" className={classes.cell}>{user.email}</TableCell>
      </TableRow>
      <TableRow className={ open ? classes.rowSelected : null}>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6} className={classes.cell}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box margin={1}>
              {/* <Typography variant="h6" gutterBottom component="div">
                Quick Info
              </Typography> */}
              <Table size="small" aria-label="user info">
                <TableHead>
                  <TableRow>
                    <TableCell className={classes.innerCell} style={{width: 120}}>Renewal</TableCell>
                    <TableCell className={classes.innerCell} style={{width: 120}}>Warnings</TableCell>
                    <TableCell className={classes.innerCell} align="right"></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow className="paper-shadow">
                    <TableCell className={classes.statusCell} style={{width: 120}}><p className={expired ? classes.bad : classes.good}>{expired ? 'Expired' : 'Clear'}</p></TableCell>
                    <TableCell className={classes.statusCell} style={{width: 120}}><p className={false ? classes.bad : classes.good}>{false ? 'Banned' : 'Clean'}</p></TableCell>
                    <TableCell className={classes.statusCell} align="right">
                      <Button className="more-info-button-user-table" component={Link} to={"admin/useroptions/" + user.uid} target="_blank" variant="outlined">More info</Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </React.Fragment>
  );
}

};
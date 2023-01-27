import React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableFooter from '@mui/material/TableFooter';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import IconButton from '@mui/material/IconButton';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import KeyboardArrowLeft from '@mui/icons-material/KeyboardArrowLeft';
import KeyboardArrowRight from '@mui/icons-material/KeyboardArrowRight';
import LastPageIcon from '@mui/icons-material/LastPage';
import Box from '@mui/material/Box';
import Collapse from '@mui/material/Collapse';
import TableHead from '@mui/material/TableHead';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { Button } from '@mui/material';
import { Link } from 'react-router-dom';

function TablePaginationActions(props) {

  const { count, page, rowsPerPage, onPageChange } = props;

  const handleFirstPageButtonClick = (event) => {
    onPageChange(event, 0);
  };

  const handleBackButtonClick = (event) => {
    onPageChange(event, page - 1);
  };

  const handleNextButtonClick = (event) => {
    onPageChange(event, page + 1);
  };

  const handleLastPageButtonClick = (event) => {
    onPageChange(event, Math.max(0, Math.ceil(count / rowsPerPage) - 1));
  };
  return (
    <div className="usertable-pagination-navigation-admin">
      <IconButton
        onClick={handleFirstPageButtonClick}
        disabled={page === 0}
        aria-label="first page"
      >
        {"" === 'rtl' ? <LastPageIcon /> : <FirstPageIcon />}
      </IconButton>
      <IconButton onClick={handleBackButtonClick} disabled={page === 0} aria-label="previous page">
        {"" === 'rtl' ? <KeyboardArrowRight /> : <KeyboardArrowLeft />}
      </IconButton>
      <IconButton
        onClick={handleNextButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
      >
        {"" === 'rtl' ? <KeyboardArrowLeft /> : <KeyboardArrowRight />}
      </IconButton>
      <IconButton
        onClick={handleLastPageButtonClick}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
      >
        {"" === 'rtl' ? <FirstPageIcon /> : <LastPageIcon />}
      </IconButton>
    </div>
  );
}

export default function UserTable({ users, index, search, length }) {
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
    <TableContainer component={Paper} className="main-admin-users-table-container">
      <Table aria-label="custom pagination table" className="main-admin-users-table">
        <TableBody>
          {(rowsPerPage > 0
            ? users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            : users
          ).map((user, i) => (
            <MUITableRow user={user} rowsPerPage={rowsPerPage} page={page} index={i} key={user.uid} />
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
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
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
    const date = new Date(dateArray[2], dateArray[0] - 1, dateArray[1])
    const today = new Date()
    if (date < today)
      return true // expired
    else
      return false // not expired
  }



  function MUITableRow({ user, page, rowsPerPage, index }) {
    const [open, setOpen] = React.useState(false);

    const expired = checkDate(user.renewal)

    return (
      <React.Fragment>
        <TableRow className={!open ? null : "selected-row-admin-users"}>
          <TableCell>
            <IconButton aria-label="expand row" size="small" onClick={() => setOpen(!open)}>
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          </TableCell>
          <TableCell component="th" scope="row">
            {`(${(index + 1) + (page * rowsPerPage)}) ${user.name}`}
          </TableCell>
          <TableCell align="right">{user.username}</TableCell>
          <TableCell align="right">{user.email}</TableCell>
        </TableRow>
        <TableRow className={!open ? null : "selected-row-admin-users"}>
          <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box margin={1}>
                {/* <Typography variant="h6" gutterBottom component="div">
                Quick Info
              </Typography> */}
                <Table size="small" aria-label="user info">
                  <TableHead>
                    <TableRow>
                      <TableCell style={{ width: 120 }}>Renewal</TableCell>
                      <TableCell style={{ width: 120 }}>Warnings</TableCell>
                      <TableCell align="right"></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow className="paper-shadow">
                      <TableCell style={{ width: 120 }}><p className={expired ? "expired-p-usertable" : null}>{expired ? 'Expired' : 'Clear'}</p></TableCell>
                      <TableCell style={{ width: 120 }}><p className={false ? null : null}>{false ? 'Banned' : 'Clean'}</p></TableCell>
                      <TableCell align="right">
                        <Button className="more-info-button-user-table" component={Link} to={"/admin/useroptions/" + user.uid} target="_blank" variant="outlined">More info</Button>
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
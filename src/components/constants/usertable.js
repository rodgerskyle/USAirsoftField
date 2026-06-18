import React from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableFooter,
  TablePagination, TableRow, Paper, Box, Collapse,
  TableHead, Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import {
  FontAwesomeIcon
} from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faChevronUp,
  faChevronLeft,
  faChevronRight,
  faAnglesLeft,
  faAnglesRight,
  faCircleCheck,
  faCircleXmark,
  faCircleInfo
} from '@fortawesome/free-solid-svg-icons';
import './admin-table.css';

function TablePaginationActions(props) {
  const { count, page, rowsPerPage, onPageChange } = props;
  const actionButtonSx = {
    minWidth: '40px',
    color: '#aab4c2',
    '&.Mui-disabled': {
      color: 'rgba(170,180,194,0.3)',
    },
  };

  return (
    <Box sx={{ display: 'flex', gap: 1 }}>
      <Button
        onClick={(e) => onPageChange(e, 0)}
        disabled={page === 0}
        aria-label="first page"
        sx={actionButtonSx}
      >
        <FontAwesomeIcon icon={faAnglesLeft} />
      </Button>
      <Button
        onClick={(e) => onPageChange(e, page - 1)}
        disabled={page === 0}
        aria-label="previous page"
        sx={actionButtonSx}
      >
        <FontAwesomeIcon icon={faChevronLeft} />
      </Button>
      <Button
        onClick={(e) => onPageChange(e, page + 1)}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="next page"
        sx={actionButtonSx}
      >
        <FontAwesomeIcon icon={faChevronRight} />
      </Button>
      <Button
        onClick={(e) => onPageChange(e, Math.max(0, Math.ceil(count / rowsPerPage) - 1))}
        disabled={page >= Math.ceil(count / rowsPerPage) - 1}
        aria-label="last page"
        sx={actionButtonSx}
      >
        <FontAwesomeIcon icon={faAnglesRight} />
      </Button>
    </Box>
  );
}

function UserRow({ user, page, rowsPerPage, index }) {
  const [open, setOpen] = React.useState(false);
  const expired = checkDate(user.renewal);

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: open ? 'rgba(31, 101, 199, 0.10)' : 'rgba(18, 23, 29, 0.96)',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'rgba(255,255,255,0.04)',
          }
        }}
      >
        <TableCell sx={{ width: 50, color: '#aab4c2' }}>
          <Button
            size="small"
            onClick={() => setOpen(!open)}
            sx={{ minWidth: '40px', color: '#aab4c2' }}
          >
            <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} />
          </Button>
        </TableCell>
        <TableCell sx={{ color: '#f4f7fb', fontWeight: 600 }}>
          {`(${(index + 1) + (page * rowsPerPage)}) ${user.name}`}
        </TableCell>
        <TableCell align="right" sx={{ color: '#aab4c2' }}>{user.username}</TableCell>
        <TableCell align="right" sx={{ color: '#aab4c2' }}>{user.email}</TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={6} sx={{ py: 0, backgroundColor: 'rgba(10,14,19,0.88)' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'rgba(255,255,255,0.08)' } }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ color: '#f4f7fb', width: 120, fontWeight: 700 }}>Renewal</TableCell>
                    <TableCell sx={{ color: '#f4f7fb', width: 120, fontWeight: 700 }}>Warnings</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: expired ? '#f87171' : '#86efac' }}>
                      <FontAwesomeIcon
                        icon={expired ? faCircleXmark : faCircleCheck}
                        className="me-2"
                      />
                      {expired ? 'Expired' : 'Clear'}
                    </TableCell>
                    <TableCell sx={{ color: '#86efac' }}>
                      <FontAwesomeIcon icon={faCircleCheck} className="me-2" />
                      Clean
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        to={`/admin/useroptions/${user.uid}`}
                        variant="contained"
                        sx={{
                          backgroundColor: '#1f65c7',
                          '&:hover': {
                            backgroundColor: '#163e7d',
                          }
                        }}
                      >
                        <FontAwesomeIcon icon={faCircleInfo} className="me-2" />
                        More Info
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function UserTable({ users, index, search, length }) {
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);

  React.useEffect(() => {
    setPage(0);
  }, [search, length]);

  const emptyRows = rowsPerPage - Math.min(rowsPerPage, length - page * rowsPerPage);

  return (
    <TableContainer
      component={Paper}
      sx={{
        backgroundColor: 'rgba(18, 23, 29, 0.96)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.22)',
        borderRadius: '16px',
      }}
    >
      <Table>
        <TableBody>
          {(rowsPerPage > 0
            ? users.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
            : users
          ).map((user, i) => (
            <UserRow
              key={user.uid}
              user={user}
              rowsPerPage={rowsPerPage}
              page={page}
              index={i}
            />
          ))}

          {emptyRows > 0 && (
            <TableRow style={{ height: 53 * emptyRows }}>
              <TableCell colSpan={6} />
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
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
                sx: { color: '#aab4c2' }
              }}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              ActionsComponent={TablePaginationActions}
              sx={{
                color: '#aab4c2',
                '& .MuiTablePagination-select': {
                  color: '#aab4c2'
                },
                '& .MuiTablePagination-selectIcon': {
                  color: '#aab4c2'
                },
                '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
                  color: '#aab4c2'
                }
              }}
            />
          </TableRow>
        </TableFooter>
      </Table>
    </TableContainer>
  );
}

// Helper function to check if date is expired
function checkDate(dt) {
  if (dt === 'N/A') return false;
  const dateArray = dt.split('-');
  const date = new Date(dateArray[2], dateArray[0] - 1, dateArray[1]);
  const today = new Date();
  return date < today;
}

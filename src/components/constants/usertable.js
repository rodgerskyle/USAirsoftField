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
    color: 'var(--admin-subtext)',
    '&.Mui-disabled': {
      color: 'var(--admin-subtext)',
      opacity: 0.45,
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
  const playerName = [user.name, user.username].find(value => typeof value === 'string' && value.trim()) || 'Unnamed player';
  const renewalStatus = expired === null ? 'Date unavailable' : expired ? 'Expired' : 'Clear';
  const renewalColor = expired === null ? 'var(--admin-subtext)' : expired ? 'var(--staff-error)' : 'var(--staff-success)';

  return (
    <>
      <TableRow
        sx={{
          '& > *': { borderBottom: 'unset' },
          backgroundColor: open ? 'var(--admin-accent-soft)' : 'var(--admin-surface)',
          transition: 'background-color 0.2s',
          '&:hover': {
            backgroundColor: 'var(--admin-surface-muted)',
          }
        }}
      >
        <TableCell sx={{ width: 50, color: 'var(--admin-subtext)' }}>
          <Button
            size="small"
            onClick={() => setOpen(!open)}
            aria-label={`Details for ${playerName}`}
            aria-expanded={open}
            sx={{ minWidth: '40px', color: 'var(--admin-subtext)' }}
          >
            <FontAwesomeIcon icon={open ? faChevronUp : faChevronDown} />
          </Button>
        </TableCell>
        <TableCell sx={{ color: 'var(--admin-text)', fontWeight: 600 }}>
          {`(${(index + 1) + (page * rowsPerPage)}) ${playerName}`}
        </TableCell>
        <TableCell align="right" sx={{ color: 'var(--admin-subtext)' }}>{typeof user.username === 'string' ? user.username : '—'}</TableCell>
        <TableCell align="right" sx={{ color: 'var(--admin-subtext)' }}>{typeof user.email === 'string' ? user.email : '—'}</TableCell>
      </TableRow>

      <TableRow>
        <TableCell colSpan={4} sx={{ py: 0, backgroundColor: 'var(--admin-surface-muted)' }}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2 }}>
              <Table size="small" sx={{ '& .MuiTableCell-root': { borderBottomColor: 'var(--admin-border)' } }}>
                <TableHead sx={{ backgroundColor: 'var(--admin-surface)' }}>
                  <TableRow>
                    <TableCell sx={{ color: 'var(--admin-text)', width: 120, fontWeight: 700 }}>Renewal</TableCell>
                    <TableCell sx={{ color: 'var(--admin-text)', width: 120, fontWeight: 700 }}>Warnings</TableCell>
                    <TableCell align="right" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ color: renewalColor }}>
                      <FontAwesomeIcon
                        icon={expired === null ? faCircleInfo : expired ? faCircleXmark : faCircleCheck}
                        className="me-2"
                      />
                      {renewalStatus}
                    </TableCell>
                    <TableCell sx={{ color: 'var(--staff-success)' }}>
                      <FontAwesomeIcon icon={faCircleCheck} className="me-2" />
                      Clean
                    </TableCell>
                    <TableCell align="right">
                      <Button
                        component={Link}
                        to={`/admin/useroptions/${user.uid}`}
                        variant="contained"
                        sx={{
                          backgroundColor: 'var(--usaw-red)',
                          color: '#fff',
                          '&:hover': {
                            backgroundColor: '#8e1824',
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

export default function UserTable({ users, search, length }) {
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
        backgroundColor: 'var(--admin-surface)',
        border: '1px solid var(--admin-border)',
        boxShadow: 'none',
        borderRadius: '10px',
      }}
    >
      <Table aria-label="Player directory">
        <TableHead sx={{ backgroundColor: 'var(--admin-surface-muted)', '& .MuiTableCell-root': { color: 'var(--admin-text)', borderBottomColor: 'var(--admin-border)' } }}>
          <TableRow>
            <TableCell scope="col"><span className="visually-hidden">Details</span></TableCell>
            <TableCell scope="col">Player</TableCell>
            <TableCell scope="col" align="right">Username</TableCell>
            <TableCell scope="col" align="right">Email</TableCell>
          </TableRow>
        </TableHead>
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
              <TableCell colSpan={4} />
            </TableRow>
          )}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, { label: 'All', value: -1 }]}
              colSpan={4}
              count={length}
              rowsPerPage={rowsPerPage}
              page={page}
                SelectProps={{
                inputProps: { 'aria-label': 'rows per page' },
                native: true,
                sx: { color: 'var(--admin-subtext)' }
              }}
              onPageChange={(e, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setRowsPerPage(parseInt(e.target.value, 10));
                setPage(0);
              }}
              ActionsComponent={TablePaginationActions}
              sx={{
                color: 'var(--admin-subtext)',
                borderTopColor: 'var(--admin-border)',
                '& .MuiTablePagination-select': {
                  color: 'var(--admin-subtext)'
                },
                '& .MuiTablePagination-selectIcon': {
                  color: 'var(--admin-subtext)'
                },
                '& .MuiTablePagination-displayedRows, & .MuiTablePagination-selectLabel': {
                  color: 'var(--admin-subtext)'
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
  const match = typeof dt === 'string' && /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(dt);
  if (!match) return null;
  const [, month, day, year] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return date < new Date();
}

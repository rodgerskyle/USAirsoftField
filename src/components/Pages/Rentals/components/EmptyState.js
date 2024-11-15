import logo from '../../../../assets/usairsoft-small-logo.png';
import { Paper, Typography, Button } from '@mui/material';
import { AssignmentTurnedIn } from '@mui/icons-material';

const EmptyState = () => (
    <Paper
        elevation={3}
        sx={{
            p: 4,
            textAlign: 'center',
            maxWidth: 600,
            margin: '40px auto',
            backgroundColor: 'rgba(255, 255, 255, 0.9)'
        }}
    >
        <img
            src={logo}
            alt="US Airsoft logo"
            style={{
                width: 120,
                marginBottom: 24,
                opacity: 0.8
            }}
        />
        <Typography
            variant="h5"
            sx={{
                mb: 2,
                color: 'text.primary',
                fontWeight: 500
            }}
        >
            No Active Rental Forms
        </Typography>
        <Typography
            variant="body1"
            sx={{
                mb: 3,
                color: 'text.secondary',
                maxWidth: 400,
                mx: 'auto'
            }}
        >
            There are currently no rental forms ready to be returned. New forms will appear here once they are completed.
        </Typography>
        {/* <Button
            variant="outlined"
            color="primary"
            startIcon={<AssignmentTurnedIn />}
            href="/admin/rentals"
            sx={{
                textTransform: 'none',
                px: 3,
                py: 1
            }}
        >
            Go to Rental Management
        </Button> */}
    </Paper>
);

export default EmptyState;
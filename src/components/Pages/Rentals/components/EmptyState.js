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
            backgroundColor: '#12171d',
            color: '#f4f7fb',
            border: '1px solid rgba(255,255,255,0.08)'
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
                color: '#f4f7fb',
                fontWeight: 500
            }}
        >
            No Active Rental Forms
        </Typography>
        <Typography
            variant="body1"
            sx={{
                mb: 3,
                color: '#9fb0c4',
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

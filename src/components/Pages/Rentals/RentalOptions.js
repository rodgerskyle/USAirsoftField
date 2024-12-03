import React, { useState, useEffect } from 'react';
import { withFirebase } from '../../Firebase';
import * as ROLES from '../../constants/roles';
import { withAuthorization } from '../../session';
import {
    Container,
    Paper,
    Typography,
    TextField,
    Button,
    Box,
    Grid,
    Snackbar,
    CircularProgress,
    Card,
    CardContent
} from '@mui/material';
import { Save, Refresh, Inventory2 } from '@mui/icons-material';
import MuiAlert from '@mui/lab/Alert';
import { onValue, set } from 'firebase/database';

const Alert = React.forwardRef((props, ref) => (
    <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />
));

const RentalRow = ({ rental, onMaxChange }) => {
    return (
        <Card
            elevation={0}
            sx={{
                mb: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                transition: 'all 0.2s ease',
                '&:hover': {
                    boxShadow: '0 4px 20px rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)'
                }
            }}
        >
            <CardContent sx={{ py: 3 }}>
                <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} md={4}>
                        <Typography
                            variant="h6"
                            sx={{
                                color: 'text.primary',
                                fontWeight: 500
                            }}
                        >
                            {rental.label}
                        </Typography>
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <TextField
                            fullWidth
                            label="In Use"
                            type="number"
                            value={rental.stock}
                            disabled
                            variant="outlined"
                            InputProps={{
                                startAdornment: <Inventory2 sx={{ color: 'text.secondary', mr: 1 }} />
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    backgroundColor: 'action.hover'
                                }
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} md={4}>
                        <TextField
                            fullWidth
                            label="Maximum"
                            type="number"
                            value={rental.max}
                            onChange={(e) => onMaxChange(e.target.value)}
                            variant="outlined"
                            color="primary"
                        />
                    </Grid>
                </Grid>
            </CardContent>
        </Card>
    );
};

const RentalOptions = (props) => {
    const { firebase, rentalOptions } = props;
    const [localOptions, setLocalOptions] = useState(rentalOptions);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    const [authUser, setAuthUser] = useState(null);

    useEffect(() => {
        const authListener = firebase.onAuthUserListener(
            (user) => setAuthUser(user),
            () => setAuthUser(null)
        );

        return () => {
            authListener();
        };
    }, [firebase]);

    useEffect(() => {
        setLocalOptions(rentalOptions);
    }, [rentalOptions]);

    const handleMaxChange = (index, value) => {
        const updatedOptions = [...localOptions];
        updatedOptions[index].max = parseInt(value);
        setLocalOptions(updatedOptions);
    };

    const handleSubmit = async () => {
        try {
            for (let option of localOptions) {
                if (option.stock > option.max) {
                    setError(`The maximum for ${option.value} cannot be less than current stock.`);
                    return;
                }
            }
            await set(firebase.rentalOptions(), localOptions);
            setSuccess("Rental inventory successfully updated.");
        } catch (err) {
            setError("Failed to update rental inventory.");
        }
    };

    const handleReset = async () => {
        try {
            const resetOptions = localOptions.map(option => ({
                ...option,
                stock: 0
            }));
            await set(firebase.rentalOptions(), resetOptions);
            setLocalOptions(resetOptions);
            setSuccess("Rental inventory successfully reset.");
        } catch (err) {
            setError("Failed to reset rental inventory.");
        }
    };

    return (
        <Box sx={{
            minHeight: '100vh',
            pt: 4,
            pb: 8
        }}>
            <Container maxWidth="lg">
                <Box sx={{ mb: 6 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 600,
                            color: '#fff',
                            mb: 1
                        }}
                    >
                        Rental Inventory Management
                    </Typography>
                    <Typography
                        variant="body1"
                        sx={{
                            color: '#fff',
                            mb: 4
                        }}
                    >
                        Manage your rental equipment inventory and maximum capacity
                    </Typography>
                </Box>

                <Box sx={{ mb: 4 }}>
                    {localOptions?.map((rental, index) => (
                        <RentalRow
                            key={index}
                            rental={rental}
                            onMaxChange={(value) => handleMaxChange(index, value)}
                        />
                    ))}
                </Box>

                <Box
                    sx={{
                        display: 'flex',
                        gap: 2,
                        justifyContent: 'flex-end'
                    }}
                >
                    <Button
                        variant="contained"
                        startIcon={<Save />}
                        onClick={handleSubmit}
                        sx={{
                            textTransform: 'none',
                            px: 4,
                            py: 1,
                            borderRadius: 2
                        }}
                    >
                        Save Changes
                    </Button>
                    {authUser?.roles[ROLES.SUPER] && (
                        <Button
                            variant="contained"
                            startIcon={<Refresh />}
                            onClick={handleReset}
                            sx={{
                                textTransform: 'none',
                                px: 4,
                                py: 1,
                                borderRadius: 2
                            }}
                        >
                            Reset Inventory
                        </Button>
                    )}
                </Box>
            </Container>
        </Box>
    );
};

const condition = authUser =>
    authUser && (!!authUser.roles[ROLES.ADMIN] || !!authUser.roles[ROLES.WAIVER]);

export default withAuthorization(condition)(withFirebase(RentalOptions));
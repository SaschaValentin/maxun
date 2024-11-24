import React, { useState, useEffect } from 'react';
import { GenericModal } from "../atoms/GenericModal";
import { TextField, Typography, Box, Button } from "@mui/material";
import { modalStyle } from "./AddWhereCondModal";
import { useGlobalInfoStore } from '../../context/globalInfo';
import { getStoredRecording, updateRecording } from '../../api/storage';
import { WhereWhatPair } from 'maxun-core';

interface RobotMeta {
    name: string;
    id: string;
    createdAt: string;
    pairs: number;
    updatedAt: string;
    params: any[];
}

interface RobotWorkflow {
    workflow: WhereWhatPair[];
}

interface RobotEditOptions {
    name: string;
    limit?: number;
}

interface ScheduleConfig {
    runEvery: number;
    runEveryUnit: 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS';
    startFrom: 'SUNDAY' | 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY';
    atTimeStart?: string;
    atTimeEnd?: string;
    timezone: string;
    lastRunAt?: Date;
    nextRunAt?: Date;
    cronExpression?: string;
}

export interface RobotSettings {
    id: string;
    userId?: number;
    recording_meta: RobotMeta;
    recording: RobotWorkflow;
    google_sheet_email?: string | null;
    google_sheet_name?: string | null;
    google_sheet_id?: string | null;
    google_access_token?: string | null;
    google_refresh_token?: string | null;
    schedule?: ScheduleConfig | null;
}

interface RobotSettingsProps {
    isOpen: boolean;
    handleStart: (settings: RobotSettings) => void;
    handleClose: () => void;
    initialSettings?: RobotSettings | null;
    
}

export const RobotEditModal = ({ isOpen, handleStart, handleClose, initialSettings }: RobotSettingsProps) => {
    const [robot, setRobot] = useState<RobotSettings | null>(null);
    const { recordingId, notify } = useGlobalInfoStore();

    useEffect(() => {
        if (isOpen) {
            getRobot();
        }
    }, [isOpen]);

    const getRobot = async () => {
        if (recordingId) {
            const robot = await getStoredRecording(recordingId);
            setRobot(robot);
        } else {
            notify('error', 'Could not find robot details. Please try again.');
        }
    }

    const handleRobotNameChange = (newName: string) => {
        setRobot((prev) =>
            prev ? { ...prev, recording_meta: { ...prev.recording_meta, name: newName } } : prev
        );
    };

    const handleTargetUrlChange = (newUrl: string) => {
        setRobot((prev) => {
            if (!prev) return prev;
    
            const updatedWorkflow = [...prev.recording.workflow];
            const lastPairIndex = updatedWorkflow.length - 1;
            
            if (lastPairIndex >= 0) {
                const gotoAction = updatedWorkflow[lastPairIndex]?.what?.find(action => action.action === "goto");
                if (gotoAction && gotoAction.args && gotoAction.args.length > 0) {
                    gotoAction.args[0] = newUrl;
                }
            }
    
            return { ...prev, recording: { ...prev.recording, workflow: updatedWorkflow } };
        });
    };

    const handleLimitChange = (newLimit: number) => {
        setRobot((prev) => {
            if (!prev) return prev;

            const updatedWorkflow = [...prev.recording.workflow];

            if (
                updatedWorkflow.length > 0 &&
                updatedWorkflow[0]?.what &&
                updatedWorkflow[0].what.length > 0 &&
                updatedWorkflow[0].what[0].args &&
                updatedWorkflow[0].what[0].args.length > 0 &&
                updatedWorkflow[0].what[0].args[0]
            ) {
                updatedWorkflow[0].what[0].args[0].limit = newLimit;
            }

            return { ...prev, recording: { ...prev.recording, workflow: updatedWorkflow } };
        });
    };
    const handleSave = async () => {
        if (!robot) return;

        try {
            const lastPair = robot.recording.workflow[robot.recording.workflow.length - 1];
            const targetUrl = lastPair?.what.find(action => action.action === "goto")?.args?.[0];

            const payload = {
                name: robot.recording_meta.name,
                limit: robot.recording.workflow[0]?.what[0]?.args?.[0]?.limit,
                targetUrl: targetUrl,
            };

            const success = await updateRecording(robot.recording_meta.id, payload);

            if (success) {
                notify('success', 'Robot updated successfully.');
                handleStart(robot); // Inform parent about the updated robot
                handleClose(); 

                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                notify('error', 'Failed to update the robot. Please try again.');
            }
        } catch (error) {
            notify('error', 'An error occurred while updating the robot.');
            console.error('Error updating robot:', error);
        }
    };

    const lastPair = robot?.recording.workflow[robot?.recording.workflow.length - 1];

    const targetUrl = lastPair?.what.find(action => action.action === "goto")?.args?.[0];

    return (
        <GenericModal
            isOpen={isOpen}
            onClose={handleClose}
            modalStyle={modalStyle}
        >
            <>
                <Typography variant="h5" style={{ marginBottom: '20px' }}>Edit Robot</Typography>
                <Box style={{ display: 'flex', flexDirection: 'column' }}>
                    {
                        robot && (
                            <>
                                <span>While editing the robot URL, please keep in mind:</span>
                                <br />
                                <span>
                                <b>⚠️ Ensure the new page has the same structure as the original page.</b>
                                </span>
                                <TextField
                                    label="Robot Target URL"
                                    key="Robot Target URL"
                                    type='text'
                                    value={targetUrl || ''}
                                    onChange={(e) => handleTargetUrlChange(e.target.value)}
                                    style={{ marginBottom: '20px', marginTop: '15px' }}
                                />
                                <TextField
                                    label="Robot Name"
                                    key="Robot Name"
                                    type='text'
                                    value={robot.recording_meta.name}
                                    onChange={(e) => handleRobotNameChange(e.target.value)}
                                    style={{ marginBottom: '20px' }}
                                />
                                {robot.recording.workflow?.[0]?.what?.[0]?.args?.[0]?.limit !== undefined && (
                                    <TextField
                                        label="Robot Limit"
                                        type="number"
                                        value={robot.recording.workflow[0].what[0].args[0].limit || ''}
                                        onChange={(e) =>
                                            handleLimitChange(parseInt(e.target.value, 10) || 0)
                                        }
                                        style={{ marginBottom: '20px' }}
                                    />
                                )}

                                <Box mt={2} display="flex" justifyContent="flex-end" onClick={handleSave}>
                                    <Button variant="contained" color="primary">
                                        Save Changes
                                    </Button>
                                    <Button onClick={handleClose} color="primary" variant="outlined" style={{ marginLeft: '10px' }}>
                                        Cancel
                                    </Button>
                                </Box>
                            </>
                        )
                    }
                </Box>
            </>
        </GenericModal>
    );
};

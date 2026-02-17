import React from 'react';

export const Toast = ({ msg, visible }: { msg: string, visible: boolean }) => {
    return (
        <div className={`offline-toast ${visible ? 'show' : ''}`}>
            {msg}
        </div>
    );
};
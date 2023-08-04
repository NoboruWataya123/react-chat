'use client'
import React, {useCallback, useEffect, useState} from 'react';
import Pusher from 'pusher-js';
import Link from "next/link";
import { FaCheck, FaCheckDouble } from 'react-icons/fa';

interface User {
    id: number;
    name: string;
    email: string;
    github_id: string;
    github_avatar: string;
    created_at: string;
    updated_at: string;
}

interface Message {
    id: number;
    message: string;
    is_delivered: boolean;
    is_read: boolean;
    sender_id: number;
    receiver_id: number;
}

function debounce(func: any, wait: number) {
    let timeout: any;
    return function executedFunction(...args: any[]) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

export default function Page({ params }: { params: { userId: string } }) {
    const [receiver, setReceiver] = useState<User | null>(null);
    const [sender, setSender] = useState<User | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [remoteIsTyping, setRemoteIsTyping] = useState(false);


    const { userId } = params;

    useEffect(() => {
        if (!userId) return;

        fetch('http://90.156.226.224/api/user', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then(response => response.json())
            .then(senderData => {
                setSender(senderData)

                fetch(`http://90.156.226.224/api/users/${userId}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                })
                    .then(response => response.json())
                    .then(receiverData => {
                        setReceiver(receiverData)

                        const receiverId = receiverData.id;
                        const isTypingChannel = pusher.subscribe(`typing`);
                        isTypingChannel.bind('App\\Events\\UserIsTyping', (data: any) => {
                            console.log(data.sender_id, receiver?.id);
                            if (receiver?.id == data.sender_id) {
                                setRemoteIsTyping(true);
                            }
                            setTimeout(() => {
                                setRemoteIsTyping(false);
                            }, 2000);
                        });
                        fetch(`http://90.156.226.224/api/messages?receiverId=${userId}&senderId=${senderData.id}`, {
                            headers: {
                                'Authorization': `Bearer ${localStorage.getItem('token')}`
                            }
                        })
                            .then(response => response.json())
                            .then(messagesData => {
                                setMessages(messagesData);
                            });
                    });
            });
        fetch(`http://90.156.226.224/api/users/${userId}`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        })
            .then((response) => response.json())
            .then((data) => {
                setReceiver(data);
            });
        const pusher = new Pusher('b7bda5523e7cdc86775a', {
            cluster: 'ap3'
        });

        const senderId = userId;
        const senderChannel = pusher.subscribe(`message-${senderId}`);

        senderChannel.bind('App\\Events\\MessageSent', (data: any) => {
            console.log(data);
            let parsedData = data.message;
            if(typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData);
                } catch(e) {
                    console.error('Error parsing data: ', e);
                }
            }
            setMessages((prevMessages) => [...prevMessages, parsedData]);
        });

        fetch('http://90.156.226.224/api/messages/read', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                receiver_id: userId,
            }),
        })
            .then(response => response.json())
            .then(data => {
                console.log(data);
            })
            .catch((error) => {
                console.error('Error:', error);
            });

        const readChannel = pusher.subscribe(`read-${userId}`);
        readChannel.bind('App\\Events\\MessageRead', (data: any) => {
            console.log(data);
            let parsedData = data.message;
            if(typeof parsedData === 'string') {
                try {
                    parsedData = JSON.parse(parsedData);
                } catch(e) {
                    console.error('Error parsing data: ', e);
                }
            }
            setMessages((prevMessages) => {
                return prevMessages.map((message) => {
                    if (message.id === parsedData.id) {
                        return parsedData;
                    }
                    return message;
                });
            });
        });

        return () => {
            pusher.unsubscribe(`message-${userId}`);
            pusher.unsubscribe(`message-${senderId}`);
            pusher.unsubscribe(`read-${userId}`);
            pusher.unsubscribe(`typing`);
        };
    }, [userId, setReceiver, setMessages, setRemoteIsTyping, receiver?.id, sender?.id]);

    const sendMessage = () => {
        if (!input.trim() || !sender || !receiver) return;

        const messageData = {
            sender_id: sender.id,
            receiver_id: receiver.id,
            message: input,
        };

        fetch('http://90.156.226.224/api/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(messageData),
        })
            .then((response) => response.json())
            .then((newMessage) => {
                setInput('');
            })
            .catch((error) => {
                console.error('Error:', error);
            });
    };

    const typing = debounce(() => {
        fetch('http://90.156.226.224/api/messages/typing', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({
                user_id: userId,
            }),
        })
            .then((response) => response.json())
            .catch((error) => {
                console.error('Error:', error);
            });
    }, 300);
    
    return (
        <div className="flex min-h-screen p-4 bg-gray-100">
            <div className="flex flex-col flex-grow border-r">
                <div className="flex items-center justify-between p-2 border-b">
                    <Link href={` / `}>
                        <h2 className="text-lg font-bold text-black">Chat</h2>
                    </Link>
                    <img className="h-8 w-8 rounded-full" src={receiver?.github_avatar} alt={receiver?.name} />
                </div>
                <div className="flex min-h-screen p-4 bg-gray-100 flex-col">
                    <div className="flex-grow overflow-auto p-2 text-black pb-16">
                        {messages.map((message, index) => (
                            <div key={index} className={`${message.sender_id === sender?.id ? 'text-right' : ''} mb-2`}>
                                <div className="inline-block">
                                    <p className="inline">
                                        <span className="font-bold text-black">{message.sender_id === sender?.id ? 'You' : receiver?.name}</span>: {message.message}
                                    </p>
                                    {message.sender_id === sender?.id &&
                                        <span className="text-xs text-gray-500 ml-2">
                    {message.is_delivered
                        ? (message.is_read
                            ? <FaCheckDouble color="green"/>
                            : <FaCheck color="blue"/>)
                        : ''}
                </span>
                                    }
                                </div>
                            </div>
                        ))}

                    </div>
                    <div className="flex items-center p-2 border-t sticky bottom-0 bg-white">
                        <div className="flex-grow text-sm text-gray-500">
                            {remoteIsTyping && receiver && <p>{receiver.name} is typing...</p>}
                        </div>
                        <input type="text" value={input} onChange={(e) => {setInput(e.target.value); typing();}} className="flex-grow border rounded p-2 mr-2 text-black" />
                        <button onClick={sendMessage} className="bg-blue-500 text-white rounded px-4 py-2">Send</button>
                    </div>
                </div>
            </div>
            <div className="w-64 border-l">
                <div className="p-2 border-b">
                    <h2 className="text-lg font-bold text-black">Online Users</h2>
                </div>
            </div>
        </div>
    );
}
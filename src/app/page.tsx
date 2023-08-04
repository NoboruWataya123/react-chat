'use client'
import Link from "next/link";
import {useEffect, useState} from 'react';
import Pusher from 'pusher-js';
import Image from "next/image";

interface User {
    id: number;
    name: string;
    email: string;
    github_id: string;
    github_avatar: string;
    created_at: string;
    updated_at: string;
}

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [onlineUsers, setOnlineUsers] = useState<User[]>([]);


    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('token');

        if (token) {
            localStorage.setItem('token', token);
            window.history.replaceState({}, document.title, "/");
        }

        const storedToken = localStorage.getItem('token');

        if (storedToken) {
            fetch('http://90.156.226.224/api/user', {
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            })
                .then(response => response.json())
                .then(data => setUser(data))

            fetch('http://90.156.226.224/api/online', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${storedToken}`
                }
            }).then(response => response.json())
                .then(data => console.log(data))
        }
        const pusher = new Pusher('b7bda5523e7cdc86775a', {
            cluster: 'ap3'
        });

        const channel = pusher.subscribe('users');
        channel.bind('App\\Events\\UserOnline', function(data: any) {
            console.log(data);
            fetch(`http://90.156.226.224/api/users/${data.userId}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            })
                .then(response => response.json())
                .then(data => {
                    setOnlineUsers((prevUsers) => {
                        if (!prevUsers.some(user => user.id === data.id)) {
                            return [...prevUsers, data];
                        } else {
                            return prevUsers;
                        }
                    });
                })
        });
        channel.bind('App\\Events\\UserOffline', function(data: any) {
            setOnlineUsers((prevUsers) => prevUsers.filter(user => user.id !== data.userId));
        });

        return () => {
            pusher.disconnect();
        }

    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-24">
            {user && (
                <div className="absolute top-0 right-0 m-4 flex items-center">
                    <img className="h-12 w-12 rounded-full" src={user.github_avatar} alt={user.name} />
                    <span className="ml-2 text-lg">{user.name}</span>
                </div>
            )}

            <div className="flex flex-col items-center justify-center">
                <h1 className="text-6xl font-bold mb-4">Welcome to Chat App</h1>
                <p className="text-xl">Login with GitHub to start chatting</p>
                <Link
                    type="button"
                    href={"http://90.156.226.224/api/login/github"}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm leading-5 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:border-indigo-700 focus:shadow-outline-indigo active:bg-indigo-700 transition duration-150 ease-in-out mt-3"
                >
                    Login with GitHub
                </Link>
            </div>
            <div className="mt-6">
                <h2 className="text-2xl font-bold mb-4">Online Users:</h2>
                {onlineUsers.map((onlineUser) => (
                    <Link href={`/chat/${onlineUser.id}`} key={onlineUser.id}>
                        <div className="flex items-center mb-2 cursor-pointer hover:bg-gray-200 p-2 rounded">
                            <Image src={onlineUser.github_avatar} alt={onlineUser.name} width={32} height={32} className="rounded-full mr-2" />
                            <span className="text-lg">{onlineUser.name}</span>
                        </div>
                    </Link>
                ))}
            </div>
        </main>
    )
}


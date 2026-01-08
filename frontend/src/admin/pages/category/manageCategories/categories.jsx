import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LoadingAdmin from "../../../components/loading/loading";
import "./categories.css"

export default function ManageCategories() {
    const [categories, setCategories] = useState([])
    const [error, setError] = useState(false)
    const [loading, setLoading] = useState(false)
    const naviagte = useNavigate();

    useEffect(() => {
        const getAllCategories = async () => {
            setLoading(true);
            try {
                const response = await fetch("", {
                    method: 'GET',
                    headers: {
                        'content-type': 'application/json'
                    }
                });

                const data = await response.json();
                if (data.success) {
                    setCategories(data.data)
                }
            }
            catch (err) {
                setError(err.message)
            }
            finally {
                setLoading(false)
            }
        }


    }, [])

    return (
        <div></div>
    )
}
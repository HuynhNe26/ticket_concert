import React, { useState } from "react";
import LoadingAdmin from "../../../components/loading/loading";
import { useNavigate } from "react-router-dom";
import "addCategory.css"

export default function AddCategory() {
    const [category, setCategory] = useState({})
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(false)
    const navigate = useNavigate();
 
    const addEvent = async () => {
        e.preventDefault()
        setLoading(true);
        try {
            const response = await fetch("", {
                method: 'POST',
                headers: {
                    'content-type': 'application/json'
                },
                body: JSON.stringify(

                )
            })

            const data = await response.json()
            if (data.success) {
                setCategory(data.data)
            }
        }
        catch (err) {
            setError(err.message)
        }
        finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingAdmin />
    }
    return (
        <div>
            <h1>Thêm thể loại</h1>
            <input 
                type="text"
                name="category"
                
            />
            <button onSubmit={addEvent}>
                Thêm thể loại
            </button>
        </div>
    )
}
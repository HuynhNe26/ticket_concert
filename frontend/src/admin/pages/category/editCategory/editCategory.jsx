import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import LoadingAdmin from "../../../components/loading/loading";

export default function EditCategory() {
    const { id } = useParams();
    const [editCategory, setEditCategory] = useState();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    useEffect(() => {   
        const getCategoryById = async () => {
            setLoading(true);
            try {
                const response = await fetch ();
                
                const data = await response.json()
                if (data.success) {
                    setEditCategory(data.data)
                } else {
                    alert("Lỗi lấy dữ liệu với id thể loại!")
                }
            } catch (err) {
                console.log(err)
            } finally {
                setLoading(false)
            }
        }
    })

    if (loading) {
        return <LoadingAdmin />
    }

    return (
        <div>

        </div>
    )
}
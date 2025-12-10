// import { useTranslation } from 'react-i18next';
import { useEffect, useState } from "react";
import LoadingUser from "../../components/loading/loading"

export default function HomeUser() {
    // const { t } = useTranslation();
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        setLoading(true)
        const getData = async () => {
            try {

            }
            catch (err) {

            }
            finally {
                setLoading(false)
            }
        }

        getData()
    }, [])

    const handleSubmit = async () => {
        e.preventDefault()
        setLoading(true)
        try {

        }
        catch(err) {

        }
        finally {
            setLoading(false)
        }
    }

    if (loading) {
        return <LoadingUser />
    }

    return (
        <div>
            <h1>Ticket Concert</h1>
        </div>
    );
}
import React, { Component } from 'react';
import { Document, Page, pdfjs } from "react-pdf";

//temp
import waiver from './waiver.pdf';
import '../../App.css';

import { Container, Row, Col } from 'react-bootstrap/';

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.js`;

class Waiver extends Component {
    constructor(props) {
        super(props);

        this.state = {
            pageNumber: 1
        };
    }

    handlePrint = (event) => {
        event.preventDefault();
        window.open(waiver, "PRINT", "height=400,width=600");
      };

    render() {
        const { pageNumber } = this.state;
        return (
            <div className="background-static-all">
                <div className="pdfStyle">
                    <h2 className="page-header">Waiver</h2>
                    <Container fluid>
                        <Row className="align-items-center">
                            <Col>
                            <a href={waiver} target='_blank' rel="noopener noreferrer">
                                <i className="fa fa-print fa-2x text-white"></i>
                            </a>
                            </Col>
                        </Row>
                        <Row className="align-items-center">
                            <Col className="pdfFile">
                                <div style={{ width: 600 }}>
                                    <Document
                                        file={waiver}
                                        onLoadSuccess={this.onDocumentLoadSuccess}
                                    >
                                        <Page pageNumber={pageNumber} width={600} />
                                    </Document>
                                </div>
                            </Col>
                        </Row>
                    </Container>
                </div>
            </div>
        );
    }
}


export default Waiver;
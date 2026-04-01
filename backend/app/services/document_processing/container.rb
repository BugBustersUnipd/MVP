module DocumentProcessing
  class Container
    # Inizializza le dipendenze del componente.
    def initialize(
      aws_region: ENV.fetch("AWS_REGION", "us-east-1"),
      broadcaster: ActionCable.server,
      ocr_service_class: DocumentProcessing::Ocr,
      data_extractor_class: DocumentProcessing::DataExtractor,
      recipient_resolver_class: DocumentProcessing::RecipientResolver,
      pdf_splitter_class: DocumentProcessing::PdfSplitter,
      image_processor_class: DocumentProcessing::ImageProcessor,
      csv_processor_class: DocumentProcessing::CsvProcessor,
      confidence_calculator_class: DocumentProcessing::ConfidenceCalculator,
      extracted_metadata_builder_class: DocumentProcessing::ExtractedMetadataBuilder,
      notifier_class: DocumentProcessing::ActionCableNotifier,
      llm_service_class: DocumentProcessing::LlmService,
      split_run_repository_class: DocumentProcessing::Persistence::SplitRunRepository,
      data_item_repository_class: DocumentProcessing::Persistence::DataItemRepository,
      file_storage_class: DocumentProcessing::Persistence::FileStorage,
      upload_manager_class: DocumentProcessing::UploadManager,
      page_range_pdf_service_class: DocumentProcessing::PageRangePdf,
      db_manager_class: DocumentProcessing::Persistence::DbManager,
      textract_client: nil,
      bedrock_client: nil
    )
      @aws_region = aws_region
      @broadcaster = broadcaster
      @ocr_service_class = ocr_service_class
      @data_extractor_class = data_extractor_class
      @recipient_resolver_class = recipient_resolver_class
      @pdf_splitter_class = pdf_splitter_class
      @image_processor_class = image_processor_class
      @csv_processor_class = csv_processor_class
      @confidence_calculator_class = confidence_calculator_class
      @extracted_metadata_builder_class = extracted_metadata_builder_class
      @notifier_class = notifier_class
      @llm_service_class = llm_service_class
      @split_run_repository_class = split_run_repository_class
      @data_item_repository_class = data_item_repository_class
      @file_storage_class = file_storage_class
      @upload_manager_class = upload_manager_class
      @page_range_pdf_service_class = page_range_pdf_service_class
      @db_manager_class = db_manager_class
      @textract_client = textract_client
      @bedrock_client = bedrock_client
    end

    # Crea e memoizza il servizio OCR basato su Textract.
    def ocr_service
      @ocr_service ||= @ocr_service_class.new(textract_client: textract_client)
    end

    # Crea e memoizza l'estrattore dati che usa il servizio LLM.
    def data_extractor
      @data_extractor ||= @data_extractor_class.new(llm_service: llm_service)
    end

    # Crea e memoizza il resolver per il matching dei destinatari.
    def recipient_resolver
      @recipient_resolver ||= @recipient_resolver_class.new
    end

    # Istanzia lo splitter PDF con le dipendenze OCR e LLM.
    def pdf_splitter(pdf:)
      @pdf_splitter_class.new(pdf: pdf, ocr_service: ocr_service, llm_service: llm_service)
    end

    # Restituisce il processore per file immagine.
    def image_processor
      @image_processor_class.new(
        ocr_service: ocr_service,
        data_extractor: data_extractor,
        recipient_resolver: recipient_resolver
      )
    end

    # Restituisce il processore dedicato ai file CSV.
    def csv_processor
      @csv_processor_class.new(data_extractor: data_extractor, recipient_resolver: recipient_resolver)
    end

    # Crea un calcolatore di confidenza per il singolo documento.
    def confidence_calculator(**kwargs)
      @confidence_calculator_class.new(**kwargs)
    end

    # Estrae e prepara i dati utili al processamento.
    def extracted_metadata_builder(**kwargs)
      @extracted_metadata_builder_class.new(**kwargs)
    end

    # Crea e memoizza il notifier verso ActionCable.
    def notifier
      @notifier ||= @notifier_class.new(broadcaster: @broadcaster)
    end

    # Crea e memoizza il repository dei run di split.
    def split_run_repository
      @split_run_repository ||= @split_run_repository_class.new
    end

    # Crea e memoizza il repository degli item elaborati.
    def data_item_repository
      @data_item_repository ||= @data_item_repository_class.new
    end

    

    
    def file_storage
      @file_storage ||= @file_storage_class.new
    end

    # Crea e memoizza il manager degli upload.
    def upload_manager
      @upload_manager ||= @upload_manager_class.new
    end

    # Espone la classe usata per estrarre range di pagine PDF.
    def page_range_pdf_service_class
      @page_range_pdf_service_class
    end

    # Crea e memoizza il manager per operazioni DB e riassegnazioni.
    def db_manager
      @db_manager ||= @db_manager_class.new(data_item_repository: data_item_repository, recipient_resolver: recipient_resolver)
    end

    
    def process_data_item_service
      DocumentProcessing::ProcessDataItem.new(
        data_item_repository: data_item_repository,
        notifier: notifier,
        file_storage: file_storage,
        ocr_service: ocr_service,
        data_extractor: data_extractor,
        recipient_resolver: recipient_resolver,
        confidence_calculator_factory: method(:confidence_calculator),
        extracted_metadata_builder_factory: method(:extracted_metadata_builder)
      )
    end

    
    def process_split_run_service
      DocumentProcessing::ProcessSplitRun.new(
        split_run_repository: split_run_repository,
        notifier: notifier,
        file_storage: file_storage,
        pdf_splitter_factory: method(:pdf_splitter),
        data_extraction_job_class: DataExtractionJob
      )
    end

    
    def file_processor(file_kind)
      case file_kind.to_s
      when "csv"   then csv_processor
      when "image" then image_processor
      else raise ArgumentError, "file_kind non supportato: #{file_kind}"
      end
    end

    
    def process_generic_file_service(file_kind:)
      DocumentProcessing::ProcessGenericFile.new(
        notifier: notifier,
        file_storage: file_storage,
        generic_file_repository: data_item_repository,
        file_processor: file_processor(file_kind),
        confidence_calculator_factory: method(:confidence_calculator)
      )
    end

    # Costruisce il comando di inizializzazione per file PDF.
    def initialize_processing_command
      DocumentProcessing::Commands::InitializeProcessing.new(
        upload_manager: upload_manager,
        pdf_split_job_class: PdfSplitJob,
        pdf_loader: CombinePDF,
        file_storage: file_storage
      )
    end

    
    def initialize_file_processing_command
      DocumentProcessing::Commands::InitializeFileProcessing.new(
        upload_manager: upload_manager,
        generic_file_processing_job_class: GenericFileProcessingJob,
        file_storage: file_storage
      )
    end

    # Costruisce il comando che riassegna un range estratto.
    def reassign_extracted_range_command
      DocumentProcessing::Commands::ReassignExtractedRange.new(
        page_range_pdf_service_class: page_range_pdf_service_class,
        data_extraction_job_class: DataExtractionJob,
        file_storage: file_storage
      )
    end

    # Invia l'output verso il canale previsto.
    def broadcast(job_id, data)
      notifier.broadcast(job_id, data)
    end

    private

    # Crea e memoizza il client Textract AWS.
    def textract_client
      @textract_client ||= Aws::Textract::Client.new(region: @aws_region)
    end

    # Crea e memoizza il client Bedrock AWS.
    def bedrock_client
      @bedrock_client ||= Aws::BedrockRuntime::Client.new(region: @aws_region)
    end

    # Crea e memoizza il servizio LLM condiviso.
    def llm_service
      @llm_service ||= @llm_service_class.new(bedrock_client: bedrock_client)
    end
  end
end
